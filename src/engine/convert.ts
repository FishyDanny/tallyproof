import { detectDateOrder, findFullDates, inferYears, parseDateToken, resolveDayMonth, toIso } from './dates.ts';
import type { DateToken } from './dates.ts';
import { groupLines } from './lines.ts';
import { parseMoney } from './money.ts';
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
const CLOSING = /\b(closing|ending|new|final)\s+balance\b|\bbalance\s+(at\s+)?end\b/i;
const SUMMARY = /\b(total|totals|subtotal|sub-total|deposits\s+and\s+other|withdrawals\s+and\s+other|checks\s+paid|year[\s-]+to[\s-]+date|ytd|minimum\s+(payment|amount)|credit\s+limit|available\s+(credit|balance)|amount\s+due|payment\s+due|overdraft\s+limit)\b/i;
const BOILERPLATE = /\bpage\s+\d+\s*(of\s+\d+)?\b|^\(?continued\b|^transactions?\s+continued/i;

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
    else if (!/^[-\u2013\u2014]+$/.test(cell.text)) descriptionCells.push(cell);
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
const MONEY_IN_TEXT = /\(?[-+−]?\s*[$£€]?\s*[-+−]?(?:\d{1,3}(?:,\d{3})+|\d+)?\.\d{2}(?!\d)\s*[-−]?\)?(?:\s*(?:CR|DR)\b)?/i;

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
  return (cells.map((c) => c.text).join(' ').match(/[A-Za-z\u00c0-\u024f]/g) ?? []).length >= 2;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0);
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

function assignHeaderRoles(columns: AmountColumn[], headers: Array<Map<HeaderRole, Cell>>): void {
  const candidates: Array<{ role: ColumnRole; cell: Cell }> = [];
  for (const header of headers) {
    for (const role of ['debit', 'credit', 'balance', 'amount'] as const) {
      const cell = header.get(role);
      if (cell) candidates.push({ role, cell });
    }
  }
  if (candidates.length === 0) return;
  const taken = new Set<number>();
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
    usedRoles.add(p.role);
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
  // Learn where the date column starts, then ignore notes printed entirely to its
  // left (margin annotations would otherwise hide the date at the start of a row).
  const firstPass = lines.map(analyseLine);
  const dateStarts = firstPass
    .filter((i) => i.date !== null && i.money.length > 0)
    .map((i) => i.line.cells[0]?.x0)
    .filter((x): x is number => x !== undefined);
  const dateX = dateStarts.length >= 3 ? median(dateStarts) : null;
  const infos = dateX === null ? firstPass : lines.map((l) => analyseLine(withoutLeftMargin(l, dateX)));
  const headers = infos.filter((i) => i.header !== null);

  // Columns come only from dated lines that carry money, so stray numbers elsewhere cannot create columns.
  const datedMoneyLines = infos.filter((i) => i.date !== null && i.money.length > 0 && i.markers.length === 0);
  if (datedMoneyLines.length === 0) {
    return noTextResult(
      'No transactions were found. This statement layout was not recognised. Nothing has been uploaded; you can report the layout (without sharing the file) so support can be added.',
    );
  }
  const columns = clusterColumns(datedMoneyLines.flatMap((i) => i.money.map((m) => m.cell.x1)));
  // A money column named in the header exists even if no dated row happens to use it
  // (for example when every withdrawal falls on a day whose date was printed only once).
  const firstHeader = headers[0]?.header;
  if (firstHeader) {
    for (const role of ['debit', 'credit', 'balance', 'amount'] as const) {
      const cell = firstHeader.get(role);
      if (cell && !columns.some((c) => Math.abs(c.right - cell.x1) <= 30)) {
        columns.push({ id: columns.length, right: cell.x1, role: 'amount', source: 'position' });
      }
    }
  }
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

  // Typical description start, used to accept wrapped description lines.
  const descStarts = datedMoneyLines.map((i) => i.descriptionCells[0]?.x0).filter((x): x is number => x !== undefined);
  const descX0 = descStarts.length > 0 ? median(descStarts) : 0;

  const rows: RowBuild[] = [];
  const markers: Array<{ kind: 'opening' | 'closing' | 'checkpoint'; cents: ParsedMoney; afterRow: number; page: number }> = [];
  let current: RowBuild | null = null;
  /** The last plain text line not yet used, for descriptions printed above their amounts. */
  let looseAbove: LineInfo | null = null;
  let carriedDate: DateToken | null = null;
  let lastTableY = Number.NEGATIVE_INFINITY;
  let lastTablePage = -1;
  const seenHeaderOnPage = new Set<number>();

  const mapValues = (info: LineInfo): Map<number, ParsedMoney> => {
    const values = new Map<number, ParsedMoney>();
    for (const m of info.money) {
      const col = nearestColumn(columns, m.cell.x1);
      if (col && col.role !== 'ignore' && !values.has(col.id)) values.set(col.id, m.value);
    }
    return values;
  };

  for (const info of infos) {
    const { line } = info;
    if (info.header) {
      seenHeaderOnPage.add(line.page);
      lastTableY = line.y;
      lastTablePage = line.page;
      current = null;
      continue;
    }
    if (info.markers.length > 0) {
      for (const m of info.markers) markers.push({ kind: m.kind, cents: m.value, afterRow: rows.length, page: line.page });
      current = null;
      if (info.markers.some((m) => m.kind === 'checkpoint') || rows.length > 0) {
        lastTableY = line.y;
        lastTablePage = line.page;
      }
      continue;
    }

    const values = mapValues(info);
    const hasAmount = [...values.keys()].some((id) => columns.find((c) => c.id === id)?.role !== 'balance');
    const lineGap = line.page === lastTablePage ? line.y - lastTableY : Number.POSITIVE_INFINITY;
    const nearTable = lineGap <= line.height * 3.2 || (line.page !== lastTablePage && seenHeaderOnPage.has(line.page));

    // Notes printed to the right of the last money column are not part of the transaction.
    const desc = info.descriptionCells.filter((cell) => cell.x0 <= rightEdge + 8);
    let words = hasWords(desc);
    const leading: string[] = [];
    if (
      !words &&
      info.date &&
      hasAmount &&
      looseAbove &&
      looseAbove.line.page === line.page &&
      line.y - looseAbove.line.y <= line.height * 1.6 &&
      (looseAbove.descriptionCells[0]?.x0 ?? 0) >= descX0 - 6 &&
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
      current = {
        info,
        date: info.date,
        descriptionParts: [...leading, ...desc.map((c) => c.text)],
        sources: [line.text],
        values,
        lastY: line.y,
        page: line.page,
      };
      rows.push(current);
      carriedDate = info.date;
      lastTableY = line.y;
      lastTablePage = line.page;
      continue;
    }

    if (!info.date && hasAmount && words && carriedDate && rows.length > 0 && !info.summary && nearTable) {
      // Same-day transaction printed without repeating the date.
      current = {
        info,
        date: carriedDate,
        descriptionParts: desc.map((c) => c.text),
        sources: [line.text],
        values,
        lastY: line.y,
        page: line.page,
      };
      rows.push(current);
      lastTableY = line.y;
      lastTablePage = line.page;
      continue;
    }

    if (
      current &&
      info.money.length === 0 &&
      !info.date &&
      desc.length > 0 &&
      line.page === current.page &&
      line.y - current.lastY <= line.height * 1.9 &&
      (desc[0]?.x0 ?? 0) >= descX0 - 6 &&
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

  // Statements can print several opening and closing figures (summary boxes,
  // table rows, other accounts on the same statement). Collect candidates in
  // order of preference; verification picks the one the transactions agree with.
  const openings: ParsedMoney[] = [];
  const closings: ParsedMoney[] = [];
  const checkpointsBefore = new Map<number, ParsedMoney[]>();
  for (const m of markers) {
    if (m.kind === 'opening' || (m.kind === 'checkpoint' && m.afterRow === 0)) {
      // The figure printed nearest above the first transaction is the most likely opening.
      if (m.afterRow === 0) openings.unshift(m.cents);
      else openings.push(m.cents);
    } else if (m.kind === 'closing') {
      // The figure printed right after the last transaction is the most likely closing.
      if (m.afterRow === rows.length) closings.unshift(m.cents);
      else closings.push(m.cents);
    } else {
      const list = checkpointsBefore.get(m.afterRow) ?? [];
      list.push(m.cents);
      checkpointsBefore.set(m.afterRow, list);
    }
  }
  // A "carried forward" balance after the last transaction is also a closing candidate.
  for (const value of [...(checkpointsBefore.get(rows.length) ?? [])].reverse()) closings.unshift(value);

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

  const verification = verifyBalances({
    drafts,
    columns,
    openings,
    closings,
    checkpointsBefore: reversed ? new Map() : checkpointsBefore,
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
