import { detectDateOrder, findFullDates, inferYears, parseDateToken, resolveDayMonth, toIso } from './dates.ts';
import type { DateToken } from './dates.ts';
import { groupLines } from './lines.ts';
import { CURRENCY_CODE, parseMoney } from './money.ts';
import type { ParsedMoney } from './money.ts';
import { verifyBalances } from './verify.ts';
import type { RowDraft } from './verify.ts';
import type {
  AmountColumn,
  Cell,
  ColumnRole,
  ConversionOptions,
  ConversionResult,
  Line,
  PageText,
  Transaction,
} from './types.ts';

type HeaderRole = 'date' | 'description' | Exclude<ColumnRole, 'ignore'>;

const HEADER_WORDS: Array<[HeaderRole, RegExp]> = [
  ['date', /^(trans(action)?\.?\s+)?date$|^(posting|value|effective|post)\s+date$|^date\s+posted$|^txn\s+date$/],
  ['description', /^(transaction\s+)?(description|details|particulars|narrative)$|^transaction$|^memo$|^payee$/],
  ['debit', /^(debits?|withdrawals?|paid\s+out|money\s+out|payments?|debit\s+amount|withdrawals?\s+and\s+debits?)$/],
  ['credit', /^(credits?|deposits?|paid\s+in|money\s+in|receipts?|credit\s+amount|deposits?\s+and\s+credits?)$/],
  ['balance', /^(running\s+)?balance$|^ledger\s+balance$/],
  ['amount', /^(transaction\s+)?amount$|^value$/],
];

const OPENING = /\b(opening|starting|beginning|previous|last\s+statement)\s+balance\b|\bbalance\s+(at\s+)?(start|beginning)\b/i;
const BROUGHT_FORWARD = /\bbrought\s+forward\b|\bb\/f(wd)?\b|\bbalance\s+forward\b/i;
const CARRIED_FORWARD = /\bcarried\s+forward\b|\bc\/f(wd)?\b/i;
// "Totals at end of period" closes a statement whose balance column carries the closing figure.
const CLOSING = /\b(closing|ending|new|final)\s+balance\b|\bbalance\s+(at\s+)?end\b|\btotals?\s+at\s+end\s+of\s+(the\s+)?(period|statement)\b/i;
const SUMMARY =
  /\b(total|totals|subtotal|sub-total|deposits\s*(and|&)\s*(other|credits)|withdrawals\s*(and|&)\s*(other|debits)|checks\s+paid|year[\s-]+to[\s-]+date|ytd|minimum\s+(payment|amount)|credit\s+limit|available\s+(credit|balance)|amount\s+due|payment\s+due|overdraft\s+limit)\b/i;
const BOILERPLATE = /\bpage\s+\d+\s*(of\s+\d+)?\b|^\(?continued\b|^transactions?\s+continued/i;
/** Text some statements print in an empty money cell instead of leaving it blank. */
const PLACEHOLDER = /^(?:[-–—]+|blank|nil)$/i;

interface MoneyCell {
  cell: Cell;
  value: ParsedMoney;
}

interface MarkerValue {
  kind: 'opening' | 'closing' | 'checkpoint';
  value: ParsedMoney;
}

interface LineInfo {
  line: Line;
  date: DateToken | null;
  money: MoneyCell[];
  descriptionCells: Cell[];
  /** Balance figures named on this line (opening, brought/carried forward, closing). */
  markers: MarkerValue[];
  summary: boolean;
  header: Map<HeaderRole, Cell> | null;
}

function normaliseHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(?\s*(\$|aud|usd|gbp|nzd|eur)\s*\)?/g, '')
    .replace(/[^a-z/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectHeader(line: Line): Map<HeaderRole, Cell> | null {
  const found = new Map<HeaderRole, Cell>();
  for (const cell of line.cells) {
    const norm = normaliseHeader(cell.text);
    for (const [role, re] of HEADER_WORDS) {
      if (re.test(norm) && !found.has(role)) {
        found.set(role, cell);
        break;
      }
    }
  }
  const moneyRoles = ['debit', 'credit', 'balance', 'amount'].filter((r) => found.has(r as HeaderRole)).length;
  if (found.size >= 3 && moneyRoles >= 1) return found;
  if (found.has('date') && moneyRoles >= 2) return found;
  return null;
}

/** Split the line into a leading date (possibly two, e.g. transaction and posting date) and the remaining cells. */
function splitDate(line: Line): { date: DateToken | null; rest: Cell[] } {
  const first = parseDateToken(line.text);
  if (!first) return { date: null, rest: line.cells };
  let remaining = line.text.trimStart().slice(first.length).trimStart();
  const second = parseDateToken(remaining);
  if (second) remaining = remaining.slice(second.length).trimStart();
  const consumed = line.text.trimStart().length - remaining.length;

  // Walk cells, dropping the consumed characters and keeping any remainder.
  const rest: Cell[] = [];
  let budget = consumed;
  for (const cell of line.cells) {
    if (budget <= 0) {
      rest.push(cell);
      continue;
    }
    const len = cell.text.length + 1;
    if (budget >= len - 1) {
      budget -= len;
      continue;
    }
    const tail = cell.text.slice(budget).trim();
    budget = 0;
    if (tail.length > 0) {
      const ratio = (cell.text.length - tail.length) / Math.max(1, cell.text.length);
      rest.push({ text: tail, x0: cell.x0 + (cell.x1 - cell.x0) * ratio, x1: cell.x1 });
    }
  }
  return { date: first, rest };
}

/** Attach a lone "CR"/"DR" cell to the money value just before it. */
function mergeSuffixCells(cells: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (const cell of cells) {
    const prev = out[out.length - 1];
    if (prev && /^(CR|DR)$/i.test(cell.text) && parseMoney(prev.text)) {
      out[out.length - 1] = { text: `${prev.text} ${cell.text}`, x0: prev.x0, x1: prev.x1 };
    } else {
      out.push(cell);
    }
  }
  return out;
}

/** Drop cells that end before the date column starts. */
function withoutLeftMargin(line: Line, dateX: number): Line {
  const cells = line.cells.filter((c) => c.x1 >= dateX - 4);
  if (cells.length === line.cells.length || cells.length === 0) return line;
  return { ...line, cells, text: cells.map((c) => c.text).join(' ') };
}

function analyseLine(line: Line): LineInfo {
  const header = detectHeader(line);
  const { date, rest } = splitDate(line);
  const money: MoneyCell[] = [];
  const descriptionCells: Cell[] = [];
  for (const cell of mergeSuffixCells(rest)) {
    const value = parseMoney(cell.text);
    if (value) money.push({ cell, value });
    else if (!PLACEHOLDER.test(cell.text)) descriptionCells.push(cell);
  }
  const markers: MarkerValue[] = [];
  if (money.length >= 1 && money.length <= 3) {
    const cells = mergeSuffixCells(line.cells);
    const kinds: Array<[MarkerValue['kind'], RegExp]> = [
      ['opening', OPENING],
      ['checkpoint', BROUGHT_FORWARD],
      ['checkpoint', CARRIED_FORWARD],
      ['closing', CLOSING],
    ];
    for (const [kind, re] of kinds) {
      const value = amountAfter(cells, re);
      if (value) markers.push({ kind, value });
    }
  }
  return { line, date, money, descriptionCells, markers, summary: SUMMARY.test(line.text), header };
}

const MARKER_PATTERNS = [OPENING, BROUGHT_FORWARD, CARRIED_FORWARD, CLOSING];
const MONEY_IN_TEXT = new RegExp(
  `\\(?[-+−]?\\s*(?:${CURRENCY_CODE}\\s*)?[$£€]?\\s*[-+−]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)?\\.\\d{2}(?!\\d)\\s*[-−]?\\)?(?:\\s*(?:CR|DR)\\b)?`,
  'i',
);

/**
 * The money value that belongs to a keyword such as "Opening balance": either
 * later in the same cell, or the next money cell to its right. Stops at another
 * keyword so side-by-side summary boxes do not borrow each other's figures.
 */
function amountAfter(cells: Cell[], re: RegExp): ParsedMoney | null {
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    if (!cell) continue;
    const m = re.exec(cell.text);
    if (!m) continue;
    const tail = cell.text.slice(m.index + m[0].length);
    const inCell = MONEY_IN_TEXT.exec(tail);
    if (inCell) {
      const v = parseMoney(inCell[0]);
      if (v) return v;
    }
    for (let j = i + 1; j < cells.length; j += 1) {
      const next = cells[j];
      if (!next) break;
      const v = parseMoney(next.text);
      if (v) return v;
      if (MARKER_PATTERNS.some((p) => p.test(next.text))) break;
    }
    return null;
  }
  return null;
}

/** Transactions always have some words in their description; summary tables of dates and figures do not. */
function hasWords(cells: Cell[]): boolean {
  return (cells.map((c) => c.text).join(' ').match(/[A-Za-zÀ-ɏ]/g) ?? []).length >= 2;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0);
}

/** A line that is neither a header, a named balance figure, a summary line nor page furniture. */
function isPlain(info: LineInfo): boolean {
  return !info.header && info.markers.length === 0 && !info.summary && !BOILERPLATE.test(info.line.text);
}

/** Where a line sits in a transaction printed over several lines. */
interface WrappedPart {
  /** Index of the dated line that starts the transaction. */
  start: number;
  /** True for the line that carries the amounts and so completes the transaction. */
  completes: boolean;
}

/**
 * Some statements print a transaction over several lines: the date and the first
 * words of the description on one line, then the rest of the description together
 * with the amounts on a later line (sometimes with a further description line in
 * between). Map every such follow-on line to the dated line that starts it.
 */
function findWrappedRows(infos: LineInfo[]): Map<number, WrappedPart> {
  const parts = new Map<number, WrappedPart>();
  let start: number | null = null;
  let last: LineInfo | null = null;
  let between = 0;
  for (let i = 0; i < infos.length; i += 1) {
    const info = infos[i];
    if (!info) continue;
    if (start !== null && last) {
      const gap = info.line.y - last.line.y;
      const close = info.line.page === last.line.page && gap >= 0 && gap <= info.line.height * 1.9;
      if (close && isPlain(info) && !info.date) {
        if (info.money.length > 0) {
          parts.set(i, { start, completes: true });
          start = null;
          last = null;
          continue;
        }
        if (info.descriptionCells.length > 0 && between < 2) {
          parts.set(i, { start, completes: false });
          between += 1;
          last = info;
          continue;
        }
      }
      start = null;
      last = null;
    }
    // A dated line without money starts a wrapped transaction when it carries the first words of a description.
    if (isPlain(info) && info.date && info.money.length === 0 && hasWords(info.descriptionCells)) {
      start = i;
      last = info;
      between = 0;
    }
  }
  return parts;
}

/** Group money right edges into columns. Values in one column share a right edge within a few points. */
function clusterColumns(rights: number[]): AmountColumn[] {
  const sorted = [...rights].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const r of sorted) {
    const last = groups[groups.length - 1];
    if (last && r - (last[last.length - 1] ?? r) <= 12) last.push(r);
    else groups.push([r]);
  }
  // Ignore stray one-off positions when there are real columns.
  const minSize = Math.max(1, Math.floor(rights.length * 0.03));
  return groups
    .filter((g) => g.length >= minSize)
    .map((g, id) => ({ id, right: median(g), role: 'amount' as ColumnRole, source: 'position' as const }));
}

function nearestColumn(columns: AmountColumn[], right: number): AmountColumn | null {
  let best: AmountColumn | null = null;
  let bestDistance = 20;
  for (const c of columns) {
    const d = Math.abs(c.right - right);
    if (d <= bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * Name the columns from the header words above them. Each header is matched on
 * its own, so a file holding statements with different layouts (for example two
 * accounts from different banks) gets a balance column for each layout. A money
 * column named in a header exists even if no row happens to use it (for example
 * when every withdrawal falls on a day whose date was printed only once), and
 * even when another layout's column of the same kind sits close to it.
 */
function assignHeaderRoles(columns: AmountColumn[], headers: Array<Map<HeaderRole, Cell>>): void {
  /** Right edge of the header word that named each column, so a header repeated on later pages is recognised as the same. */
  const labelledAt = new Map<number, number>();
  const taken = new Set<number>();
  for (const header of headers) {
    const candidates: Array<{ role: ColumnRole; cell: Cell }> = [];
    for (const role of ['debit', 'credit', 'balance', 'amount'] as const) {
      const cell = header.get(role);
      if (cell) candidates.push({ role, cell });
    }
    if (candidates.length === 0) continue;
    // Closest pairs first, so each column and each header word is used once.
    const pairs = columns
      .flatMap((col) =>
        candidates.map((c) => {
          const centre = (c.cell.x0 + c.cell.x1) / 2;
          const distance = Math.min(Math.abs(col.right - c.cell.x1), Math.abs(col.right - centre) + 4);
          return { col, role: c.role, distance };
        }),
      )
      .filter((p) => p.distance <= 70)
      .sort((a, b) => a.distance - b.distance);
    const usedRoles = new Set<ColumnRole>();
    for (const p of pairs) {
      if (taken.has(p.col.id) || usedRoles.has(p.role)) continue;
      p.col.role = p.role;
      p.col.source = 'header';
      taken.add(p.col.id);
      labelledAt.set(p.col.id, candidates.find((c) => c.role === p.role)?.cell.x1 ?? p.col.right);
      usedRoles.add(p.role);
    }
    for (const c of candidates) {
      if (usedRoles.has(c.role)) continue;
      // The same header word again (a repeated page header), or a word whose values would
      // land in an existing column of this kind anyway, needs no column of its own.
      const explained = columns.some(
        (col) =>
          col.role === c.role &&
          taken.has(col.id) &&
          (Math.abs((labelledAt.get(col.id) ?? col.right) - c.cell.x1) <= 12 || Math.abs(col.right - c.cell.x1) <= 20),
      );
      if (explained) continue;
      const column: AmountColumn = { id: columns.length, right: c.cell.x1, role: c.role, source: 'header' };
      columns.push(column);
      taken.add(column.id);
      labelledAt.set(column.id, c.cell.x1);
      usedRoles.add(c.role);
    }
  }
}

function noTextResult(warning: string): ConversionResult {
  return {
    transactions: [],
    balance: { openingCents: null, closingCents: null, totalsMatch: null },
    summary: { transactions: 0, verified: 0, mismatched: 0, unchecked: 0, moneyInCents: 0, moneyOutCents: 0 },
    columns: [],
    dateOrder: 'dmy',
    liabilityBalance: false,
    warnings: [warning],
  };
}

interface RowBuild {
  info: LineInfo;
  date: DateToken;
  descriptionParts: string[];
  sources: string[];
  values: Map<number, ParsedMoney>;
  lastY: number;
  page: number;
}

/** A dated line whose amounts are still to come on a later line. */
interface PendingRow {
  start: number;
  date: DateToken;
  descriptionParts: string[];
  sources: string[];
  lastY: number;
  page: number;
}

interface MarkerAt {
  kind: MarkerValue['kind'];
  value: ParsedMoney;
  /** The figure named next to the keyword when it differs from the one in the balance column. */
  alternate: ParsedMoney | null;
  afterRow: number;
}

/**
 * Convert extracted statement text into transactions and check every row
 * against the printed running balance.
 */
export function convertStatement(pages: PageText[], options: ConversionOptions = {}): ConversionResult {
  const totalItems = pages.reduce((n, p) => n + p.items.filter((i) => i.text.trim().length > 0).length, 0);
  if (totalItems === 0) {
    return noTextResult(
      'This PDF has no text layer, so it is probably a scanned image. Scanned statements are not supported yet. Download the statement from your online banking as a PDF instead of scanning it.',
    );
  }

  const lines = groupLines(pages);
  /** Lines that begin a transaction: dated lines with money, plus dated lines whose amounts follow on a later line. */
  const rowStarts = (infos: LineInfo[], wrapped: Map<number, WrappedPart>): LineInfo[] => {
    const starts = infos.filter((i) => i.date !== null && i.money.length > 0 && i.markers.length === 0);
    const wrappedStarts = new Set([...wrapped.values()].filter((p) => p.completes).map((p) => p.start));
    for (const index of wrappedStarts) {
      const info = infos[index];
      if (info) starts.push(info);
    }
    return starts;
  };

  // Learn where the date column starts, then ignore notes printed entirely to its
  // left (margin annotations would otherwise hide the date at the start of a row).
  const firstPass = lines.map(analyseLine);
  const dateStarts = rowStarts(firstPass, findWrappedRows(firstPass))
    .map((i) => i.line.cells[0]?.x0)
    .filter((x): x is number => x !== undefined);
  const dateX = dateStarts.length >= 3 ? median(dateStarts) : null;
  const infos = dateX === null ? firstPass : lines.map((l) => analyseLine(withoutLeftMargin(l, dateX)));
  const wrapped = findWrappedRows(infos);
  const wrappedStarts = new Set([...wrapped.values()].filter((p) => p.completes).map((p) => p.start));
  const headers = infos.filter((i) => i.header !== null);

  // Columns come only from lines that carry a transaction's money (dated lines, and
  // the amounts line of a wrapped transaction), so stray numbers elsewhere cannot create columns.
  const moneyLines = infos.filter(
    (i, index) => (i.date !== null && i.money.length > 0 && i.markers.length === 0) || wrapped.get(index)?.completes === true,
  );
  if (moneyLines.length === 0) {
    return noTextResult(
      'No transactions were found. This statement layout was not recognised. Nothing has been uploaded; you can report the layout (without sharing the file) so support can be added.',
    );
  }
  const columns = clusterColumns(moneyLines.flatMap((i) => i.money.map((m) => m.cell.x1)));
  assignHeaderRoles(
    columns,
    headers.map((h) => h.header).filter((h): h is Map<HeaderRole, Cell> => h !== null),
  );
  const sortedByX = [...columns].sort((a, b) => a.right - b.right);
  if (!columns.some((c) => c.source === 'header')) {
    const rightmost = sortedByX[sortedByX.length - 1];
    if (rightmost && sortedByX.length >= 2) {
      rightmost.role = 'balance';
    }
  }
  for (const col of columns) {
    const override = options.columnRoles?.[col.id];
    if (override) {
      col.role = override;
      col.source = 'user';
    }
  }

  const rightEdge = Math.max(...columns.map((c) => c.right));
  const roleOf = (id: number): ColumnRole | undefined => columns.find((c) => c.id === id)?.role;

  // Typical description start, used to accept wrapped description lines.
  const descStarts = rowStarts(infos, wrapped)
    .map((i) => i.descriptionCells[0]?.x0)
    .filter((x): x is number => x !== undefined);
  const descX0 = descStarts.length > 0 ? median(descStarts) : 0;

  const rows: RowBuild[] = [];
  const markers: MarkerAt[] = [];
  /** Indices of rows that open a table printed below other rows on the same page (another account or statement). */
  const tableStarts = new Set<number>();
  let current: RowBuild | null = null;
  let pending: PendingRow | null = null;
  /** The last plain text line not yet used, for descriptions printed above their amounts. */
  let looseAbove: LineInfo | null = null;
  let carriedDate: DateToken | null = null;
  let lastTableY = Number.NEGATIVE_INFINITY;
  let lastTablePage = -1;
  let lastRowPage = -1;
  /** Description start for the current table: its header word when there is one, else the typical start. */
  let sectionDescX0 = descX0;
  const seenHeaderOnPage = new Set<number>();

  const mapValues = (info: LineInfo): Map<number, ParsedMoney> => {
    const values = new Map<number, ParsedMoney>();
    for (const m of info.money) {
      const col = nearestColumn(columns, m.cell.x1);
      if (col && col.role !== 'ignore' && !values.has(col.id)) values.set(col.id, m.value);
    }
    return values;
  };
  const balanceValueOf = (values: Map<number, ParsedMoney>): ParsedMoney | null => {
    for (const [id, value] of values) {
      if (roleOf(id) === 'balance') return value;
    }
    return null;
  };
  const addRow = (row: RowBuild): RowBuild => {
    rows.push(row);
    carriedDate = row.date;
    lastTableY = row.lastY;
    lastTablePage = row.page;
    lastRowPage = row.page;
    return row;
  };

  for (let index = 0; index < infos.length; index += 1) {
    const info = infos[index];
    if (!info) continue;
    const { line } = info;
    if (info.header) {
      seenHeaderOnPage.add(line.page);
      // A header printed below rows on the same page starts a new table.
      if (rows.length > 0 && lastRowPage === line.page) tableStarts.add(rows.length);
      const descriptionCell = info.header.get('description');
      sectionDescX0 = descriptionCell ? Math.min(descriptionCell.x0, descX0) : descX0;
      lastTableY = line.y;
      lastTablePage = line.page;
      current = null;
      pending = null;
      continue;
    }
    if (info.markers.length > 0) {
      // The figure in the balance column is the one that matters on a line such as
      // "Transaction totals / Closing balance", where other columns hold totals.
      const balanceValue = balanceValueOf(mapValues(info));
      for (const m of info.markers) {
        const value = balanceValue ?? m.value;
        const alternate = balanceValue && balanceValue.cents !== m.value.cents ? m.value : null;
        markers.push({ kind: m.kind, value, alternate, afterRow: rows.length });
      }
      current = null;
      pending = null;
      if (info.markers.some((m) => m.kind === 'checkpoint') || rows.length > 0) {
        lastTableY = line.y;
        lastTablePage = line.page;
      }
      continue;
    }

    const values = mapValues(info);
    const hasAmount = [...values.keys()].some((id) => roleOf(id) !== 'balance');
    const lineGap = line.page === lastTablePage ? line.y - lastTableY : Number.POSITIVE_INFINITY;
    const nearTable = lineGap <= line.height * 3.2 || (line.page !== lastTablePage && seenHeaderOnPage.has(line.page));

    // Notes printed to the right of the last money column are not part of the transaction.
    const desc = info.descriptionCells.filter((cell) => cell.x0 <= rightEdge + 8);
    const descStart = desc[0]?.x0;
    const descInColumn = descStart === undefined || (descStart >= sectionDescX0 - 6 && descStart <= rightEdge + 8);

    // A transaction printed over several lines: the date came earlier, the amounts are here.
    const part = wrapped.get(index);
    if (pending && part && part.start === pending.start) {
      if (part.completes) {
        if (hasAmount) {
          current = addRow({
            info,
            date: pending.date,
            descriptionParts: [...pending.descriptionParts, ...desc.map((c) => c.text)],
            sources: [...pending.sources, line.text],
            values,
            lastY: line.y,
            page: line.page,
          });
          pending = null;
          continue;
        }
      } else if (desc.length > 0 && descInColumn && line.page === pending.page && line.y - pending.lastY <= line.height * 1.9) {
        pending.descriptionParts.push(desc.map((cell) => cell.text).join(' '));
        pending.sources.push(line.text);
        pending.lastY = line.y;
        continue;
      }
    }
    pending = null;
    if (info.date && info.money.length === 0 && wrappedStarts.has(index)) {
      const firstCell = line.cells[0];
      const atDateColumn = dateX === null || (firstCell !== undefined && Math.abs(firstCell.x0 - dateX) <= 40);
      if (atDateColumn && descInColumn) {
        pending = {
          start: index,
          date: info.date,
          descriptionParts: desc.map((c) => c.text),
          sources: [line.text],
          lastY: line.y,
          page: line.page,
        };
        current = null;
        looseAbove = null;
        continue;
      }
    }

    let words = hasWords(desc);
    const leading: string[] = [];
    if (
      !words &&
      info.date &&
      hasAmount &&
      looseAbove &&
      looseAbove.line.page === line.page &&
      line.y - looseAbove.line.y <= line.height * 1.6 &&
      (looseAbove.descriptionCells[0]?.x0 ?? 0) >= sectionDescX0 - 6 &&
      (looseAbove.descriptionCells[0]?.x0 ?? 0) <= rightEdge + 8 &&
      !looseAbove.summary &&
      !BOILERPLATE.test(looseAbove.line.text)
    ) {
      // Some statements centre a long description vertically, so part of it sits above the amounts.
      leading.push(looseAbove.line.text);
      words = hasWords(looseAbove.descriptionCells);
    }
    // A dated row with amounts under a recognised header counts even with no description.
    const bareRow = desc.length === 0 && seenHeaderOnPage.has(line.page);
    if (info.date && hasAmount && (words || bareRow)) {
      current = addRow({
        info,
        date: info.date,
        descriptionParts: [...leading, ...desc.map((c) => c.text)],
        sources: [line.text],
        values,
        lastY: line.y,
        page: line.page,
      });
      continue;
    }

    if (!info.date && hasAmount && words && carriedDate && rows.length > 0 && !info.summary && nearTable) {
      // Same-day transaction printed without repeating the date.
      current = addRow({
        info,
        date: carriedDate,
        descriptionParts: desc.map((c) => c.text),
        sources: [line.text],
        values,
        lastY: line.y,
        page: line.page,
      });
      continue;
    }

    if (
      current &&
      info.money.length === 0 &&
      !info.date &&
      desc.length > 0 &&
      line.page === current.page &&
      line.y - current.lastY <= line.height * 1.9 &&
      (desc[0]?.x0 ?? 0) >= sectionDescX0 - 6 &&
      !BOILERPLATE.test(line.text) &&
      !info.summary
    ) {
      current.descriptionParts.push(desc.map((cell) => cell.text).join(' '));
      current.sources.push(line.text);
      current.lastY = line.y;
      lastTableY = line.y;
      continue;
    }

    if (info.money.length > 0 || info.date) current = null;
    looseAbove = info.money.length === 0 && !info.date ? info : null;
  }

  if (rows.length === 0) {
    return noTextResult('No transactions were found. This statement layout was not recognised.');
  }

  // Resolve dates: order, then years.
  const dateOrder = options.dateOrder ?? detectDateOrder(rows.map((r) => r.date));
  const resolved = rows.map((r) => resolveDayMonth(r.date, dateOrder));
  const warnings: string[] = [];
  const badDates = resolved.filter((r) => r === null).length;
  if (badDates > 0) warnings.push(`${badDates} row(s) had a date that is not valid as ${dateOrder.toUpperCase()}; check the date order setting.`);
  const anchorText = lines
    .filter((l) => l.page === (pages[0]?.pageNumber ?? 1))
    .map((l) => l.text)
    .join('\n');
  const anchors = findFullDates(anchorText);
  const dayMonths = resolved.map((r, i) => ({ day: r?.day ?? 1, month: r?.month ?? 1, year: rows[i]?.date.year ?? null }));
  const { years, guessed } = inferYears(dayMonths, anchors);
  if (guessed) warnings.push('The statement does not print years and no statement period was found, so the current year was assumed.');

  const drafts: RowDraft[] = rows.map((r, i) => {
    const dm = dayMonths[i] ?? { day: 1, month: 1 };
    return {
      date: toIso(years[i] ?? 0, dm.month, dm.day),
      description: r.descriptionParts.join(' ').replace(/\s+/g, ' ').trim(),
      values: r.values,
      page: r.page,
      source: r.sources.join(' / '),
    };
  });

  // Newest-first statements are verified oldest-first.
  let ascending = 0;
  let descending = 0;
  for (let i = 1; i < drafts.length; i += 1) {
    const a = drafts[i - 1]?.date ?? '';
    const b = drafts[i]?.date ?? '';
    if (b > a) ascending += 1;
    else if (b < a) descending += 1;
  }
  const reversed = descending > ascending;

  // Statements can print several opening and closing figures (summary boxes,
  // table rows, other accounts on the same statement). Collect candidates in
  // order of preference; verification picks the one the transactions agree with.
  const openings: ParsedMoney[] = [];
  const closings: ParsedMoney[] = [];
  const endCheckpoints: ParsedMoney[] = [];
  /** Named balances printed between two transactions, by the row they precede. */
  const boundaries = new Map<number, MarkerAt[]>();
  for (const m of markers) {
    const candidates = m.alternate ? [m.value, m.alternate] : [m.value];
    if (m.kind === 'opening' || (m.kind === 'checkpoint' && m.afterRow === 0)) {
      // The figure printed nearest above the first transaction is the most likely opening.
      if (m.afterRow === 0) openings.unshift(...candidates);
      else openings.push(...candidates);
    } else if (m.kind === 'closing') {
      // The figure printed right after the last transaction is the most likely closing.
      if (m.afterRow === rows.length) closings.unshift(...candidates);
      else closings.push(...candidates);
    } else if (m.afterRow === rows.length) {
      endCheckpoints.push(m.value);
    }
    if (m.afterRow > 0 && m.afterRow < rows.length) {
      const list = boundaries.get(m.afterRow) ?? [];
      list.push(m);
      boundaries.set(m.afterRow, list);
    }
  }
  // A "carried forward" balance after the last transaction is also a closing candidate.
  for (const value of [...endCheckpoints].reverse()) closings.unshift(value);

  // A balance named between two transactions restarts the running balance: a page
  // break, or the next statement or account in a file that holds several. When a
  // summary box prints both figures, the opening (or brought forward) one printed
  // last is the balance the following rows start from.
  const checkpointsBefore = new Map<number, ParsedMoney[]>();
  for (const [afterRow, list] of boundaries) {
    const boundary = [...list].reverse().find((m) => m.kind !== 'closing') ?? list[list.length - 1];
    if (boundary) checkpointsBefore.set(afterRow, [boundary.value]);
  }

  const verification = verifyBalances({
    drafts,
    columns,
    openings,
    closings,
    checkpointsBefore: reversed ? new Map() : checkpointsBefore,
    tableStartsBefore: reversed ? new Set() : tableStarts,
    reversed,
  });
  warnings.push(...verification.warnings);

  const transactions: Transaction[] = verification.transactions;
  const summary = {
    transactions: transactions.length,
    verified: transactions.filter((t) => t.status === 'verified' || t.status === 'verified-group').length,
    mismatched: transactions.filter((t) => t.status === 'mismatch').length,
    unchecked: transactions.filter((t) => t.status === 'unchecked').length,
    moneyInCents: transactions.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0),
    moneyOutCents: -transactions.filter((t) => t.amountCents < 0).reduce((s, t) => s + t.amountCents, 0),
  };

  return {
    transactions,
    balance: verification.balance,
    summary,
    columns,
    dateOrder,
    liabilityBalance: verification.liability,
    warnings,
  };
}
