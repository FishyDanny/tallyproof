/*
 * Fixture generator for Tallyproof.
 *
 * Usage ("fixtures" script in package.json):
 *   pnpm fixtures
 *   node --experimental-strip-types scripts/make-fixtures.ts
 *
 * Writes synthetic bank statement PDFs and a ground-truth `<name>.expected.json`
 * for each into tests/fixtures/. Output is deterministic (seeded PRNG and fixed
 * PDF metadata), so re-running produces byte-identical files. Every bank,
 * person, merchant and account number is fictional. The script throws when a
 * fixture breaks its own invariants (running balances, transaction counts,
 * description widths, date coverage), so a clean run means each JSON file
 * matches its PDF.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Color, PDFFont, PDFPage } from 'pdf-lib';
import type { ExpectedFixture, ExpectedTransaction } from '../tests/fixtures/expected-types.ts';

const OUTPUT_DIR = new URL('../tests/fixtures/', import.meta.url);
const FIXED_DATE = new Date(Date.UTC(2026, 2, 1, 0, 0, 0));
const MISPRINT_CENTS = 1000;

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`Missing value: ${what}`);
  }
  return value;
}

function check(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Fixture invariant failed: ${message}`);
  }
}

interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
}

/** mulberry32: tiny, fast and deterministic. */
function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const chance = (probability: number): boolean => next() < probability;
  return { next, int, chance };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return must(items[rng.int(0, items.length - 1)], 'pick from an empty list');
}

/** A reference number with `count` digits and no leading zero. */
function digits(rng: Rng, count: number): string {
  let out = String(rng.int(1, 9));
  for (let i = 1; i < count; i += 1) {
    out += String(rng.int(0, 9));
  }
  return out;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/* ------------------------------------------------------------------ */
/* Calendar dates                                                      */
/* ------------------------------------------------------------------ */

interface CalendarDate {
  readonly y: number;
  readonly m: number;
  readonly d: number;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function makeDate(y: number, m: number, d: number): CalendarDate {
  return { y, m, d };
}

function toUtc(date: CalendarDate): number {
  return Date.UTC(date.y, date.m - 1, date.d);
}

function fromUtc(ms: number): CalendarDate {
  const value = new Date(ms);
  return makeDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtc(toUtc(date) + days * 86_400_000);
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toUtc(a) - toUtc(b);
}

function daySpan(start: CalendarDate, end: CalendarDate): number {
  return Math.round((toUtc(end) - toUtc(start)) / 86_400_000);
}

function isoDate(date: CalendarDate): string {
  return `${date.y}-${pad2(date.m)}-${pad2(date.d)}`;
}

function monthAbbr(date: CalendarDate): string {
  return must(MONTH_ABBR[date.m - 1], `month ${date.m}`);
}

/** "03 Dec" */
function fmtDayMon(date: CalendarDate): string {
  return `${pad2(date.d)} ${monthAbbr(date)}`;
}

/** "05 Jan 26" */
function fmtDayMonYy(date: CalendarDate): string {
  return `${pad2(date.d)} ${monthAbbr(date)} ${pad2(date.y % 100)}`;
}

/** "01/05" (mm/dd) */
function fmtMmDd(date: CalendarDate): string {
  return `${pad2(date.m)}/${pad2(date.d)}`;
}

/** "Jan 05" */
function fmtMonDay(date: CalendarDate): string {
  return `${monthAbbr(date)} ${pad2(date.d)}`;
}

/** "15/01/2026" */
function fmtDdMmYyyy(date: CalendarDate): string {
  return `${pad2(date.d)}/${pad2(date.m)}/${date.y}`;
}

/** "15/01/26" */
function fmtDdMmYy(date: CalendarDate): string {
  return `${pad2(date.d)}/${pad2(date.m)}/${pad2(date.y % 100)}`;
}

/** Random dates in [start, end], sorted ascending. Duplicates are allowed. */
function scatterDates(rng: Rng, start: CalendarDate, end: CalendarDate, count: number): CalendarDate[] {
  const span = daySpan(start, end);
  const out: CalendarDate[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(addDays(start, rng.int(0, span)));
  }
  return out.sort(compareDates);
}

/** `count` distinct dates in [start, end], sorted ascending. */
function distinctDates(rng: Rng, start: CalendarDate, end: CalendarDate, count: number): CalendarDate[] {
  const pool: CalendarDate[] = [];
  for (let i = 0; i <= daySpan(start, end); i += 1) {
    pool.push(addDays(start, i));
  }
  check(count <= pool.length, 'distinctDates asked for more days than the range holds');
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = must(pool[i], 'shuffle a');
    const b = must(pool[j], 'shuffle b');
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, count).sort(compareDates);
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Absolute value of `cents` as "1,234.56". */
function fmtMoney(cents: number): string {
  check(Number.isInteger(cents), `non-integer cents ${cents}`);
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${pad2(abs % 100)}`;
}

/* ------------------------------------------------------------------ */
/* Transaction model                                                   */
/* ------------------------------------------------------------------ */

interface Txn {
  date: CalendarDate;
  /** Printed description lines; the first is on the dated row, the rest are continuations. */
  lines: string[];
  amountCents: number;
}

function normaliseText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function txn(date: CalendarDate, lines: string[], amountCents: number): Txn {
  for (const line of lines) {
    check(line === normaliseText(line) && line.length > 0, `description line is not normalised: "${line}"`);
  }
  check(Number.isInteger(amountCents) && amountCents !== 0, `bad amount ${amountCents}`);
  return { date, lines, amountCents };
}

/** Stable sort by date, keeping insertion order for same-day rows. */
function sortTxns(txns: Txn[]): Txn[] {
  return [...txns].sort((a, b) => compareDates(a.date, b.date));
}

function runningBalances(openingCents: number, txns: readonly Txn[]): number[] {
  const out: number[] = [];
  let running = openingCents;
  for (const t of txns) {
    running += t.amountCents;
    out.push(running);
  }
  return out;
}

function sumWhere(txns: readonly Txn[], keep: (t: Txn) => boolean): number {
  return txns.filter(keep).reduce((total, t) => total + t.amountCents, 0);
}

function expectedRow(t: Txn, balanceCents: number | null): ExpectedTransaction {
  return {
    date: isoDate(t.date),
    description: t.lines.join(' '),
    amountCents: t.amountCents,
    balanceCents,
  };
}

/* ------------------------------------------------------------------ */
/* PDF drawing                                                         */
/* ------------------------------------------------------------------ */

interface PageSize {
  width: number;
  height: number;
}

const A4: PageSize = { width: 595.28, height: 841.89 };
const LETTER: PageSize = { width: 612, height: 792 };

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.38, 0.4, 0.44);
const RULE = rgb(0.72, 0.74, 0.78);
const SHADE = rgb(0.93, 0.94, 0.96);

const TABLE_FONT_SIZE = 8.5;
const LINE_HEIGHT = 12.5;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface TextStyle {
  size: number;
  bold?: boolean;
  colour?: Color;
}

interface LabelValue {
  label: string;
  value: string;
}

interface HeaderInfo {
  bankName: string;
  tagline: string;
  title: string;
  holderLines: string[];
  details: LabelValue[];
  /** Short account line shown on continuation pages. */
  continuationLine: string;
  brandColour: Color;
  disclaimer: string;
}

/** Top-based cursor: `y` is distance from the top edge of the page. */
interface Cursor {
  page: PDFPage;
  y: number;
}

type Align = 'left' | 'right';

interface ColumnDef {
  key: string;
  header: string;
  /** Left edge for left-aligned columns, right edge for right-aligned columns. */
  x: number;
  align: Align;
}

interface TableRow {
  cells: Record<string, string>;
  /** Extra description lines printed under the first line, description column only. */
  continuation: string[];
  /** True running balance after this row, used for carried/brought forward lines. */
  balanceAfterCents: number | null;
}

interface TableSpec {
  columns: ColumnDef[];
  descriptionKey: string;
  /** Description text must end left of this x. */
  descriptionMaxX: number;
  showHeader: boolean;
  /** Heading drawn at the top of each continuation page, if any. */
  continuedTitle: string | null;
  carryForward: ((balanceCents: number) => TableRow) | null;
  broughtForward: ((balanceCents: number) => TableRow) | null;
}

interface TableResult {
  cursor: Cursor;
  /** Indices of rows that were the first row on a new page. */
  pageStarts: number[];
}

function plainRow(cells: Record<string, string>, continuation: string[] = [], balanceAfterCents: number | null = null): TableRow {
  return { cells, continuation, balanceAfterCents };
}

class StatementBuilder {
  doc: PDFDocument;
  fonts: Fonts;
  size: PageSize;
  header: HeaderInfo;
  pages: PDFPage[];
  contentBottom: number;

  constructor(doc: PDFDocument, fonts: Fonts, size: PageSize, header: HeaderInfo) {
    this.doc = doc;
    this.fonts = fonts;
    this.size = size;
    this.header = header;
    this.pages = [];
    this.contentBottom = size.height - 64;
  }

  static async create(size: PageSize, header: HeaderInfo): Promise<StatementBuilder> {
    const doc = await PDFDocument.create({ updateMetadata: false });
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new StatementBuilder(doc, { regular, bold }, size, header);
  }

  font(style: TextStyle): PDFFont {
    return style.bold === true ? this.fonts.bold : this.fonts.regular;
  }

  measure(value: string, style: TextStyle): number {
    return this.font(style).widthOfTextAtSize(value, style.size);
  }

  /** Draws left-aligned text with its baseline `baseline` points from the top. Returns the width. */
  text(page: PDFPage, value: string, x: number, baseline: number, style: TextStyle): number {
    const width = this.measure(value, style);
    check(x >= 20 && x + width <= this.size.width - 20, `text runs off the page: "${value}"`);
    page.drawText(value, {
      x,
      y: this.size.height - baseline,
      size: style.size,
      font: this.font(style),
      color: style.colour ?? INK,
    });
    return width;
  }

  textRight(page: PDFPage, value: string, right: number, baseline: number, style: TextStyle): number {
    const width = this.measure(value, style);
    this.text(page, value, right - width, baseline, style);
    return width;
  }

  rule(page: PDFPage, x0: number, x1: number, y: number, thickness = 0.6, colour: Color = RULE): void {
    page.drawLine({
      start: { x: x0, y: this.size.height - y },
      end: { x: x1, y: this.size.height - y },
      thickness,
      color: colour,
    });
  }

  box(page: PDFPage, x: number, top: number, width: number, height: number, fill: Color, border: Color | null = null): void {
    if (border === null) {
      page.drawRectangle({ x, y: this.size.height - top - height, width, height, color: fill });
    } else {
      page.drawRectangle({
        x,
        y: this.size.height - top - height,
        width,
        height,
        color: fill,
        borderColor: border,
        borderWidth: 0.6,
      });
    }
  }

  newPage(): Cursor {
    const page = this.doc.addPage([this.size.width, this.size.height]);
    this.pages.push(page);
    const y = this.pages.length === 1 ? this.drawFirstHeader(page) : this.drawContinuationHeader(page);
    return { page, y };
  }

  drawFirstHeader(page: PDFPage): number {
    const h = this.header;
    const right = this.size.width - 40;
    this.box(page, 0, 0, this.size.width, 8, h.brandColour);
    this.text(page, h.bankName, 40, 44, { size: 17, bold: true, colour: h.brandColour });
    this.text(page, h.tagline, 40, 57, { size: 7.5, colour: MUTED });
    this.textRight(page, h.title, right, 44, { size: 11, bold: true });

    let holderY = 92;
    h.holderLines.forEach((line, index) => {
      this.text(page, line, 40, holderY, { size: 9, bold: index === 0 });
      holderY += 11.5;
    });

    let detailY = 78;
    const widest = Math.max(...h.details.map((item) => this.measure(item.value, { size: 8 })));
    const valueX = Math.min(this.size.width - 165, this.size.width - 40 - widest);
    const labelX = valueX - 90;
    for (const item of h.details) {
      this.text(page, item.label, labelX, detailY, { size: 8, colour: MUTED });
      this.text(page, item.value, valueX, detailY, { size: 8 });
      detailY += 11.5;
    }
    const bottom = Math.max(holderY, detailY) + 8;
    this.rule(page, 40, right, bottom, 0.8);
    return bottom + 14;
  }

  drawContinuationHeader(page: PDFPage): number {
    const h = this.header;
    this.box(page, 0, 0, this.size.width, 8, h.brandColour);
    this.text(page, h.bankName, 40, 38, { size: 12, bold: true, colour: h.brandColour });
    this.text(page, h.continuationLine, 210, 38, { size: 8, colour: MUTED });
    this.rule(page, 40, this.size.width - 40, 48, 0.8);
    return 64;
  }

  /** Starts a new page when fewer than `needed` points remain. */
  ensureSpace(cursor: Cursor, needed: number): Cursor {
    return cursor.y + needed > this.contentBottom ? this.newPage() : cursor;
  }

  heading(cursor: Cursor, value: string, size = 10): Cursor {
    const c = this.ensureSpace(cursor, size + 20);
    this.text(c.page, value, 40, c.y + size, { size, bold: true });
    return { page: c.page, y: c.y + size + 8 };
  }

  paragraph(cursor: Cursor, lines: readonly string[], size = 8, leading = 11): Cursor {
    let c = cursor;
    for (const line of lines) {
      c = this.ensureSpace(c, leading);
      if (line.length > 0) {
        this.text(c.page, line, 40, c.y + size, { size });
      }
      c = { page: c.page, y: c.y + leading };
    }
    return c;
  }

  tableHeader(cursor: Cursor, spec: TableSpec): Cursor {
    const { page, y } = cursor;
    this.box(page, 36, y - 1, this.size.width - 72, LINE_HEIGHT + 3, SHADE);
    const baseline = y + TABLE_FONT_SIZE + 1.5;
    for (const col of spec.columns) {
      const style: TextStyle = { size: TABLE_FONT_SIZE, bold: true };
      if (col.align === 'left') {
        this.text(page, col.header, col.x, baseline, style);
      } else {
        this.textRight(page, col.header, col.x, baseline, style);
      }
    }
    return { page, y: y + LINE_HEIGHT + 6 };
  }

  placeCell(page: PDFPage, spec: TableSpec, col: ColumnDef, value: string, baseline: number): void {
    const style: TextStyle = { size: TABLE_FONT_SIZE };
    const width = this.measure(value, style);
    const descCol = must(
      spec.columns.find((c) => c.key === spec.descriptionKey),
      'description column',
    );
    if (col.key === spec.descriptionKey) {
      check(col.x + width <= spec.descriptionMaxX, `description too wide (${(col.x + width).toFixed(1)} > ${spec.descriptionMaxX}): "${value}"`);
    } else if (col.align === 'right') {
      check(col.x - width > spec.descriptionMaxX + 2, `money cell overlaps description: "${value}"`);
    } else {
      check(col.x + width < descCol.x - 2, `left cell overlaps description: "${value}"`);
    }
    if (col.align === 'left') {
      this.text(page, value, col.x, baseline, style);
    } else {
      this.textRight(page, value, col.x, baseline, style);
    }
  }

  tableRow(cursor: Cursor, spec: TableSpec, row: TableRow): Cursor {
    const baseline = cursor.y + TABLE_FONT_SIZE + 1;
    for (const col of spec.columns) {
      const value = row.cells[col.key];
      if (value !== undefined && value !== '') {
        this.placeCell(cursor.page, spec, col, value, baseline);
      }
    }
    const descCol = must(
      spec.columns.find((c) => c.key === spec.descriptionKey),
      'description column',
    );
    row.continuation.forEach((line, index) => {
      this.placeCell(cursor.page, spec, descCol, line, baseline + (index + 1) * LINE_HEIGHT);
    });
    return { page: cursor.page, y: cursor.y + LINE_HEIGHT * (1 + row.continuation.length) };
  }

  table(start: Cursor, spec: TableSpec, rows: readonly TableRow[]): TableResult {
    let c = spec.showHeader ? this.tableHeader(this.ensureSpace(start, LINE_HEIGHT * 3), spec) : start;
    const pageStarts: number[] = [];
    let lastBalance: number | null = null;
    rows.forEach((row, index) => {
      const height = LINE_HEIGHT * (1 + row.continuation.length);
      const reserve = spec.carryForward === null ? 0 : LINE_HEIGHT;
      if (c.y + height + reserve > this.contentBottom) {
        if (spec.carryForward !== null && lastBalance !== null) {
          c = this.tableRow(c, spec, spec.carryForward(lastBalance));
        }
        c = this.newPage();
        if (spec.continuedTitle !== null) {
          c = this.heading(c, spec.continuedTitle, 9);
        }
        if (spec.showHeader) {
          c = this.tableHeader(c, spec);
        }
        if (spec.broughtForward !== null && lastBalance !== null) {
          c = this.tableRow(c, spec, spec.broughtForward(lastBalance));
        }
        pageStarts.push(index);
      }
      c = this.tableRow(c, spec, row);
      if (row.balanceAfterCents !== null) {
        lastBalance = row.balanceAfterCents;
      }
    });
    return { cursor: c, pageStarts };
  }

  async finish(): Promise<Uint8Array> {
    const total = this.pages.length;
    const disclaimerStyle: TextStyle = { size: 6.5, colour: MUTED };
    check(this.measure(this.header.disclaimer, disclaimerStyle) < this.size.width - 160, 'disclaimer too wide');
    this.pages.forEach((page, index) => {
      const baseline = this.size.height - 38;
      this.rule(page, 40, this.size.width - 40, this.size.height - 52);
      this.text(page, this.header.disclaimer, 40, baseline, disclaimerStyle);
      this.textRight(page, `Page ${index + 1} of ${total}`, this.size.width - 40, baseline, { size: 7.5 });
    });
    return finaliseDocument(this.doc, `${this.header.bankName} statement`, this.header.bankName);
  }
}

async function finaliseDocument(doc: PDFDocument, title: string, author: string): Promise<Uint8Array> {
  doc.setTitle(title);
  doc.setAuthor(author);
  doc.setCreator('Tallyproof fixture generator');
  doc.setProducer('pdf-lib');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  return doc.save({ useObjectStreams: false });
}

/* ------------------------------------------------------------------ */
/* Fixture output and validation                                       */
/* ------------------------------------------------------------------ */

interface FixtureChecks {
  /** False only for the image-only fixture. */
  expectTransactions: boolean;
  balanceNeverNegative: boolean;
  balanceGoesNegative: boolean;
  requireDayAbove12: boolean;
  /** Minimum number of rows whose day and month are both <= 12. */
  minAmbiguousDates: number;
}

interface FixtureOutput {
  expected: ExpectedFixture;
  pdf: Uint8Array;
  pages: number;
  checks: FixtureChecks;
  notes: string[];
}

function validate(output: FixtureOutput): void {
  const { expected, checks } = output;
  const rows = expected.transactions;
  const name = expected.name;

  if (!checks.expectTransactions) {
    check(rows.length === 0, `${name}: expected no transactions`);
    return;
  }
  check(rows.length >= 25 && rows.length <= 60, `${name}: ${rows.length} transactions (want 25-60)`);
  check(
    rows.some((r) => Math.abs(r.amountCents) >= 100_000),
    `${name}: needs at least one amount with a thousands separator`,
  );

  let previous = '';
  for (const r of rows) {
    check(/^\d{4}-\d{2}-\d{2}$/.test(r.date), `${name}: bad date ${r.date}`);
    check(r.date >= previous, `${name}: dates out of order at ${r.date}`);
    previous = r.date;
    check(r.description === normaliseText(r.description) && r.description.length > 0, `${name}: bad description "${r.description}"`);
    check(Number.isInteger(r.amountCents) && r.amountCents !== 0, `${name}: bad amount ${r.amountCents}`);
  }

  const days = rows.map((r) => Number(r.date.slice(8, 10)));
  if (checks.requireDayAbove12) {
    check(days.some((d) => d > 12), `${name}: needs a day above 12`);
  }
  const ambiguous = rows.filter((r) => Number(r.date.slice(8, 10)) <= 12 && Number(r.date.slice(5, 7)) <= 12).length;
  check(ambiguous >= checks.minAmbiguousDates, `${name}: only ${ambiguous} ambiguous dates`);

  const opening = expected.openingCents;
  const closing = expected.closingCents;
  check(opening !== null && closing !== null, `${name}: opening and closing are required`);
  const total = rows.reduce((sum, r) => sum + r.amountCents, 0);

  if (expected.liabilityBalance) {
    check(rows.every((r) => r.balanceCents === null), `${name}: credit card rows carry no balance`);
    check(opening - total === closing, `${name}: owed opening - sum(amounts) must equal owed closing`);
    check(opening > 0 && closing > 0, `${name}: owed amounts are printed as positive numbers`);
    return;
  }

  check(opening + total === closing, `${name}: opening + sum(amounts) must equal closing`);
  const mismatchDates = new Set(expected.mismatchDates ?? []);
  for (const date of mismatchDates) {
    check(rows.filter((r) => r.date === date).length === 1, `${name}: mismatch date ${date} must be unique`);
  }
  let running = opening;
  let wentNegative = false;
  let misprints = 0;
  for (const r of rows) {
    running += r.amountCents;
    if (running < 0) {
      wentNegative = true;
    }
    if (r.balanceCents === null) {
      continue;
    }
    if (mismatchDates.has(r.date)) {
      check(r.balanceCents === running + MISPRINT_CENTS, `${name}: misprint on ${r.date} should be off by exactly 10.00`);
      misprints += 1;
    } else {
      check(r.balanceCents === running, `${name}: balance on ${r.date} "${r.description}" is ${r.balanceCents}, expected ${running}`);
    }
  }
  check(misprints === mismatchDates.size, `${name}: every mismatch date needs a printed balance`);
  check(rows.some((r) => r.balanceCents !== null), `${name}: some balances must be printed`);
  if (checks.balanceNeverNegative) {
    check(!wentNegative, `${name}: balance must never go negative`);
  }
  if (checks.balanceGoesNegative) {
    check(wentNegative, `${name}: balance must go negative at some point`);
  }
}

function defaultChecks(): FixtureChecks {
  return {
    expectTransactions: true,
    balanceNeverNegative: false,
    balanceGoesNegative: false,
    requireDayAbove12: true,
    minAmbiguousDates: 2,
  };
}

/* ------------------------------------------------------------------ */
/* Merchant data (all fictional)                                       */
/* ------------------------------------------------------------------ */

interface Merchant {
  name: string;
  place: string;
  minCents: number;
  maxCents: number;
}

const AU_MERCHANTS: readonly Merchant[] = [
  { name: 'CORNER BAKEHOUSE', place: 'NEWTOWN', minCents: 450, maxCents: 2850 },
  { name: 'GREENLEAF GROCERS', place: 'MARRICKVILLE', minCents: 2200, maxCents: 18900 },
  { name: 'HARBOUR FUEL CO', place: 'ROZELLE', minCents: 4000, maxCents: 9800 },
  { name: 'BLUE GUM CAFE', place: 'SURRY HILLS', minCents: 520, maxCents: 3600 },
  { name: 'METRO CHEMIST', place: 'GLEBE', minCents: 899, maxCents: 6450 },
  { name: 'SUNRISE NOODLE BAR', place: 'HAYMARKET', minCents: 1450, maxCents: 5800 },
  { name: 'BRIGHTSIDE HARDWARE', place: 'LEICHHARDT', minCents: 1200, maxCents: 24900 },
  { name: 'PADDO PET SUPPLIES', place: 'PADDINGTON', minCents: 1800, maxCents: 9200 },
  { name: 'OCEANVIEW CINEMAS', place: 'MANLY', minCents: 1650, maxCents: 6400 },
];

const US_MERCHANTS: readonly Merchant[] = [
  { name: 'Lakeside Grocery', place: 'Seattle WA', minCents: 1800, maxCents: 16500 },
  { name: 'Pinecrest Coffee Co', place: 'Seattle WA', minCents: 425, maxCents: 1450 },
  { name: 'Evergreen Fuel 0412', place: 'Bellevue WA', minCents: 3200, maxCents: 7800 },
  { name: 'Northgate Pharmacy', place: 'Seattle WA', minCents: 650, maxCents: 5400 },
  { name: 'Cedar Street Books', place: 'Seattle WA', minCents: 1299, maxCents: 6400 },
  { name: 'Rainier Pizza Kitchen', place: 'Seattle WA', minCents: 1850, maxCents: 5200 },
  { name: 'Summit Hardware', place: 'Redmond WA', minCents: 899, maxCents: 21500 },
];

const CARD_MERCHANTS: readonly Merchant[] = [
  { name: 'LAKESIDE GROCERY', place: 'SEATTLE WA', minCents: 1800, maxCents: 16500 },
  { name: 'PINECREST COFFEE CO', place: 'SEATTLE WA', minCents: 425, maxCents: 1450 },
  { name: 'EVERGREEN FUEL 0412', place: 'BELLEVUE WA', minCents: 3200, maxCents: 7800 },
  { name: 'NORTHGATE PHARMACY', place: 'SEATTLE WA', minCents: 650, maxCents: 5400 },
  { name: 'HILLTOP STEAKHOUSE', place: 'SEATTLE WA', minCents: 6400, maxCents: 18800 },
  { name: 'METRO RIDESHARE', place: 'HELP.EXAMPLE CA', minCents: 900, maxCents: 4600 },
  { name: 'PARCELPOST MARKETPLACE', place: 'ONLINE', minCents: 1299, maxCents: 23900 },
  { name: 'STREAMLY VIDEO', place: '888-555-0142 CA', minCents: 1599, maxCents: 1599 },
];

/* ------------------------------------------------------------------ */
/* Australian debit / credit / balance (fixtures 1 and 9)             */
/* ------------------------------------------------------------------ */

function auRandomTxn(rng: Rng, date: CalendarDate): Txn {
  const roll = rng.next();
  if (roll < 0.62) {
    const m = pick(rng, AU_MERCHANTS);
    const first = `${m.name} ${m.place} NS AUS`;
    const lines = rng.chance(0.45) ? [first, `Card xx4821 Value Date: ${fmtDdMmYyyy(addDays(date, -rng.int(1, 2)))}`] : [first];
    return txn(date, lines, -rng.int(m.minCents, m.maxCents));
  }
  if (roll < 0.74) {
    const biller = pick(rng, ['Direct Debit 062145 NORTHSHORE ENERGY', 'Direct Debit 448812 BRIGHTWAVE MOBILE', 'Direct Debit 301977 HARBOURVIEW INSURE']);
    return txn(date, [biller], -rng.int(4500, 34000));
  }
  if (roll < 0.83) {
    return txn(date, [`Cash Out ATM ${pick(rng, ['KINGS CROSS', 'NEWTOWN', 'CIRCULAR QUAY'])}`], -pick(rng, [5000, 10000, 20000]));
  }
  if (roll < 0.93) {
    const who = pick(rng, ['MR S NGUYEN', 'MS P OKAFOR', 'J CITIZEN']);
    const note = pick(rng, ['Dinner', 'Concert tix', 'Bills share', 'Birthday gift']);
    return txn(date, [`Transfer From ${who}`, `NetBank ${note}`], rng.int(2000, 25000));
  }
  return txn(date, [`Refund ${pick(rng, ['GREENLEAF GROCERS', 'BRIGHTSIDE HARDWARE', 'METRO CHEMIST'])} NS AUS`], rng.int(1000, 6000));
}

function auTransactions(rng: Rng, start: CalendarDate, end: CalendarDate): Txn[] {
  const txns: Txn[] = [];
  for (let d = makeDate(2025, 12, 4); compareDates(d, end) <= 0; d = addDays(d, 14)) {
    txns.push(txn(d, ['Direct Credit 401234 ACME LOGISTICS', `SALARY PAY ${digits(rng, 7)}`], 328450));
  }
  for (const [y, m] of [
    [2025, 12],
    [2026, 1],
    [2026, 2],
  ] as const) {
    txns.push(txn(makeDate(y, m, 2), ['Transfer To Harbourside Realty', 'NetBank RENT UNIT 4'], -215000));
    txns.push(txn(makeDate(y, m, 15), [`BPAY CONTOSO CARD ${digits(rng, 9)}`], -rng.int(60000, 140000)));
    txns.push(txn(makeDate(y, m, 20), ['Transfer To xx9921 NetBank Savings'], -300000));
  }
  for (const date of scatterDates(rng, addDays(start, 1), addDays(end, -1), 30)) {
    txns.push(auRandomTxn(rng, date));
  }
  return sortTxns(txns);
}

interface AuOptions {
  name: string;
  description: string;
  seed: number;
  holderLines: string[];
  accountNumber: string;
  openingCents: number;
  misprint: boolean;
}

async function buildAuStatement(options: AuOptions): Promise<FixtureOutput> {
  const rng = createRng(options.seed);
  const start = makeDate(2025, 12, 1);
  const end = makeDate(2026, 2, 28);
  const txns = auTransactions(rng, start, end);
  const balances = runningBalances(options.openingCents, txns);
  const closing = must(balances[balances.length - 1], 'closing balance');

  let misprintIndex = -1;
  if (options.misprint) {
    misprintIndex = txns.findIndex((t, index) => {
      const sameDay = txns.filter((o) => compareDates(o.date, t.date) === 0).length;
      return index >= 10 && index <= 20 && sameDay === 1;
    });
    check(misprintIndex >= 0, 'no unique-date row available for the misprint');
  }
  const printed = balances.map((b, index) => (index === misprintIndex ? b + MISPRINT_CENTS : b));

  const builder = await StatementBuilder.create(A4, {
    bankName: 'Example Bank',
    tagline: 'Example Bank Ltd  |  examplebank.example  |  Everyday banking',
    title: 'Statement of Account',
    holderLines: options.holderLines,
    details: [
      { label: 'Account name', value: must(options.holderLines[0], 'holder') },
      { label: 'Account type', value: 'Everyday Access' },
      { label: 'Account number', value: options.accountNumber },
      { label: 'Statement period', value: '1 Dec 2025 to 28 Feb 2026' },
      { label: 'Statement number', value: '14 (page 1)' },
    ],
    continuationLine: `Account ${options.accountNumber}  |  Statement period 1 Dec 2025 to 28 Feb 2026`,
    brandColour: rgb(0.85, 0.62, 0.05),
    disclaimer: 'Example Bank Ltd. Check this statement carefully and tell us promptly about any entry that looks wrong. Synthetic test document.',
  });

  const columns: ColumnDef[] = [
    { key: 'date', header: 'Date', x: 40, align: 'left' },
    { key: 'desc', header: 'Transaction details', x: 88, align: 'left' },
    { key: 'debit', header: 'Debit', x: 390, align: 'right' },
    { key: 'credit', header: 'Credit', x: 465, align: 'right' },
    { key: 'balance', header: 'Balance', x: 555, align: 'right' },
  ];
  const cr = (cents: number): string => `${fmtMoney(cents)} CR`;
  const spec: TableSpec = {
    columns,
    descriptionKey: 'desc',
    descriptionMaxX: 325,
    showHeader: true,
    continuedTitle: 'Transactions (continued)',
    carryForward: (b) => plainRow({ desc: 'Balance carried forward', balance: cr(b) }),
    broughtForward: (b) => plainRow({ desc: 'Balance brought forward', balance: cr(b) }),
  };

  const rows: TableRow[] = [plainRow({ date: fmtDayMon(start), desc: 'OPENING BALANCE', balance: cr(options.openingCents) }, [], options.openingCents)];
  txns.forEach((t, index) => {
    const amount = fmtMoney(t.amountCents);
    rows.push(
      plainRow(
        {
          date: fmtDayMon(t.date),
          desc: must(t.lines[0], 'line'),
          debit: t.amountCents < 0 ? amount : '',
          credit: t.amountCents > 0 ? amount : '',
          balance: cr(must(printed[index], 'printed balance')),
        },
        t.lines.slice(1),
        must(balances[index], 'balance'),
      ),
    );
  });
  rows.push(plainRow({ date: fmtDayMon(end), desc: 'CLOSING BALANCE', balance: cr(closing) }, [], closing));

  let cursor = builder.newPage();
  cursor = builder.heading(cursor, 'Transactions');
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();

  const notes: string[] = [`page breaks before table rows ${result.pageStarts.join(', ')} (row 0 is OPENING BALANCE)`];
  if (options.misprint) {
    const tableIndex = misprintIndex + 1;
    check(!result.pageStarts.includes(tableIndex) && !result.pageStarts.includes(tableIndex + 1), 'misprint row must not sit on a page boundary');
    notes.push(`misprinted balance on table row ${tableIndex} (${isoDate(must(txns[misprintIndex], 'misprint txn').date)})`);
  }

  const expected: ExpectedFixture = {
    name: options.name,
    description: options.description,
    dateOrder: 'dmy',
    liabilityBalance: false,
    openingCents: options.openingCents,
    closingCents: closing,
    transactions: txns.map((t, index) => expectedRow(t, must(printed[index], 'printed'))),
    ...(options.misprint ? { mismatchDates: [isoDate(must(txns[misprintIndex], 'misprint txn').date)] } : {}),
  };
  return {
    expected,
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceNeverNegative: true },
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* 2. UK paid out / paid in, sparse dates and balances                */
/* ------------------------------------------------------------------ */

interface UkTemplate {
  text: string;
  minCents: number;
  maxCents: number;
  credit: boolean;
}

const UK_TEMPLATES: readonly UkTemplate[] = [
  { text: 'VIS CORNER STORES LEEDS', minCents: 350, maxCents: 4200, credit: false },
  { text: '))) HOLLOW OAK COFFEE YORK', minCents: 280, maxCents: 950, credit: false },
  { text: 'VIS KIRKGATE BUTCHERS LEEDS', minCents: 600, maxCents: 3800, credit: false },
  { text: '))) CITY BUS TICKETS LEEDS', minCents: 230, maxCents: 600, credit: false },
  { text: 'DD NORTHERN WATER LTD', minCents: 2800, maxCents: 4800, credit: false },
  { text: 'DD BRIGHTWAVE MOBILE', minCents: 1200, maxCents: 2500, credit: false },
  { text: 'BP J PATEL DINNER', minCents: 1500, maxCents: 4500, credit: false },
  { text: 'VIS PAGEFORD BOOKSHOP LEEDS', minCents: 799, maxCents: 3499, credit: false },
  { text: 'VIS ONLINE GROCER 0800 555 0199', minCents: 2400, maxCents: 11800, credit: false },
  { text: 'CR J SAMPLE REFUND', minCents: 500, maxCents: 6000, credit: true },
  { text: 'FPI M SAMPLE BIRTHDAY', minCents: 2000, maxCents: 10000, credit: true },
];

async function buildUk(): Promise<FixtureOutput> {
  const rng = createRng(2026_01_02);
  const start = makeDate(2026, 1, 1);
  const end = makeDate(2026, 1, 31);
  const openingCents = 352340;

  const txns: Txn[] = [];
  txns.push(txn(makeDate(2026, 1, 2), ['SO HOLLYBANK LETTINGS RENT'], -115000));
  txns.push(txn(makeDate(2026, 1, 28), ['CR ACME PAYROLL LTD SALARY'], 284612));
  for (const day of distinctDates(rng, makeDate(2026, 1, 2), makeDate(2026, 1, 30), 16)) {
    const count = rng.int(1, 4);
    for (let i = 0; i < count; i += 1) {
      const template = pick(rng, UK_TEMPLATES);
      const cents = rng.int(template.minCents, template.maxCents);
      txns.push(txn(day, [template.text], template.credit ? cents : -cents));
    }
    if (rng.chance(0.25)) {
      txns.push(txn(day, ['ATM CASH HEADROW LEEDS'], -pick(rng, [2000, 5000, 10000])));
    }
  }
  const sorted = sortTxns(txns);
  const balances = runningBalances(openingCents, sorted);
  const closing = must(balances[balances.length - 1], 'closing');

  const isFirstOfDay = (index: number): boolean => {
    const prev = sorted[index - 1];
    return prev === undefined || compareDates(prev.date, must(sorted[index], 'row').date) !== 0;
  };
  const isLastOfDay = (index: number): boolean => {
    const next = sorted[index + 1];
    return next === undefined || compareDates(next.date, must(sorted[index], 'row').date) !== 0;
  };
  const multiDays = new Set(sorted.filter((_t, index) => !isLastOfDay(index)).map((t) => isoDate(t.date))).size;
  check(multiDays >= 5, 'UK fixture needs several days with more than one transaction');

  const builder = await StatementBuilder.create(A4, {
    bankName: 'Northwind Savings',
    tagline: 'Northwind Savings plc  |  northwind.example  |  Personal banking',
    title: 'Your Statement',
    holderLines: ['MR ALEX J SAMPLE', '14 EXAMPLE ROAD', 'LEEDS', 'LS99 9ZZ'],
    details: [
      { label: 'Account', value: 'Classic Current Account' },
      { label: 'Account number', value: '87654321' },
      { label: 'Statement date', value: '31 January 2026' },
      { label: 'Period', value: '1 January to 31 January 2026' },
    ],
    continuationLine: 'Classic Current Account  |  Account number 87654321  |  January 2026',
    brandColour: rgb(0.0, 0.33, 0.47),
    disclaimer: 'Northwind Savings plc. Please keep this statement for your records. Synthetic test document.',
  });

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: 'Date', x: 40, align: 'left' },
      { key: 'desc', header: 'Description', x: 95, align: 'left' },
      { key: 'out', header: 'Paid out', x: 390, align: 'right' },
      { key: 'in', header: 'Paid in', x: 465, align: 'right' },
      { key: 'balance', header: 'Balance', x: 555, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 330,
    showHeader: true,
    continuedTitle: 'Your transactions (continued)',
    carryForward: null,
    broughtForward: null,
  };

  const rows: TableRow[] = [plainRow({ date: fmtDayMonYy(start), desc: 'BALANCE BROUGHT FORWARD', balance: fmtMoney(openingCents) })];
  const printedBalances: (number | null)[] = [];
  sorted.forEach((t, index) => {
    const amount = fmtMoney(t.amountCents);
    const balance = isLastOfDay(index) ? must(balances[index], 'balance') : null;
    printedBalances.push(balance);
    rows.push(
      plainRow({
        date: isFirstOfDay(index) ? fmtDayMonYy(t.date) : '',
        desc: must(t.lines[0], 'line'),
        out: t.amountCents < 0 ? amount : '',
        in: t.amountCents > 0 ? amount : '',
        balance: balance === null ? '' : fmtMoney(balance),
      }),
    );
  });
  rows.push(plainRow({ date: fmtDayMonYy(end), desc: 'BALANCE CARRIED FORWARD', balance: fmtMoney(closing) }));

  let cursor = builder.newPage();
  cursor = builder.heading(cursor, 'Your transactions');
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();

  const notes = result.pageStarts.map((rowIndex) => {
    const t = sorted[rowIndex - 1];
    const dated = t === undefined ? true : isFirstOfDay(rowIndex - 1);
    return `page break before table row ${rowIndex}; that row ${dated ? 'prints its date' : 'has an EMPTY date cell (day continues from previous page)'}`;
  });

  return {
    expected: {
      name: 'uk-paid-out-in',
      description:
        'UK current account: "05 Jan 26" dates, Date | Description | Paid out | Paid in | Balance. The date is printed only on the first transaction of each day and the balance only on the last transaction of each day; other rows have blank cells. Opening and closing come from BALANCE BROUGHT FORWARD / BALANCE CARRIED FORWARD rows.',
      dateOrder: 'dmy',
      liabilityBalance: false,
      openingCents,
      closingCents: closing,
      transactions: sorted.map((t, index) => expectedRow(t, must(printedBalances[index], 'printed'))),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceNeverNegative: true },
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* 3. US signed amount with summary box                                */
/* ------------------------------------------------------------------ */

function usPurchaseDate(rng: Rng, date: CalendarDate, start: CalendarDate): CalendarDate {
  const candidate = addDays(date, -rng.int(0, 2));
  return compareDates(candidate, start) < 0 ? start : candidate;
}

async function buildUs(): Promise<FixtureOutput> {
  const rng = createRng(2026_01_31);
  const start = makeDate(2026, 1, 1);
  const end = makeDate(2026, 1, 31);
  const openingCents = 214055;

  const txns: Txn[] = [
    txn(makeDate(2026, 1, 2), ['Zelle Payment To Oakridge Apartments 19283746501'], -165000),
    txn(makeDate(2026, 1, 9), ['Tailwind Traders Payroll PPD ID: 9876543210'], 261540),
    txn(makeDate(2026, 1, 23), ['Tailwind Traders Payroll PPD ID: 9876543210'], 261540),
    txn(makeDate(2026, 1, 15), ['Cascade Power Utility Pymt PPD ID: 4455667788'], -13218),
    txn(makeDate(2026, 1, 20), ['Contoso Card Services Payment PPD ID: 1122334455'], -84527),
    txn(makeDate(2026, 1, 30), ['Interest Payment'], 42),
  ];
  for (const date of scatterDates(rng, addDays(start, 1), addDays(end, -1), 32)) {
    const roll = rng.next();
    const purchased = fmtMmDd(usPurchaseDate(rng, date, start));
    if (roll < 0.72) {
      const m = pick(rng, US_MERCHANTS);
      txns.push(txn(date, [`Card Purchase ${purchased} ${m.name} ${m.place} Card 7712`], -rng.int(m.minCents, m.maxCents)));
    } else if (roll < 0.8) {
      txns.push(txn(date, [`Recurring Card Purchase ${purchased} Streamly Video 888-555-0142 CA Card 7712`], -1599));
    } else if (roll < 0.88) {
      txns.push(txn(date, [`ATM Withdrawal ${purchased} 1200 Pine St Seattle WA Card 7712`], -pick(rng, [6000, 10000, 20000])));
    } else {
      const source = pick(rng, ['Venmo Cashout PPD ID: 5264681992', 'Zelle Payment From Casey Example 20419938']);
      txns.push(txn(date, [source], rng.int(2500, 30000)));
    }
  }
  const sorted = sortTxns(txns);
  const balances = runningBalances(openingCents, sorted);
  const closing = must(balances[balances.length - 1], 'closing');
  const deposits = sumWhere(sorted, (t) => t.amountCents > 0);
  const withdrawals = sumWhere(sorted, (t) => t.amountCents < 0);

  const builder = await StatementBuilder.create(LETTER, {
    bankName: 'Fabrikam National Bank',
    tagline: 'Fabrikam National Bank, N.A.  |  fabrikam.example  |  Member FDIC (sample)',
    title: 'Total Checking Statement',
    holderLines: ['JORDAN EXAMPLE', '1200 SAMPLE AVE APT 4B', 'SPRINGFIELD ST 00000'],
    details: [
      { label: 'Account number', value: 'XXXXXX4417' },
      { label: 'Statement period', value: 'January 1, 2026 through January 31, 2026' },
      { label: 'Customer service', value: '1-800-555-0100' },
    ],
    continuationLine: 'Account XXXXXX4417  |  January 1, 2026 through January 31, 2026',
    brandColour: rgb(0.06, 0.24, 0.5),
    disclaimer: 'Fabrikam National Bank, N.A. Deposit products offered by Fabrikam National Bank. Synthetic test document.',
  });

  let cursor = builder.newPage();
  // Summary box: values right-aligned at x = 322, well away from the table money columns.
  const boxTop = cursor.y;
  const summary: LabelValue[] = [
    { label: 'Beginning balance on January 1, 2026', value: `$${fmtMoney(openingCents)}` },
    { label: 'Deposits and other credits', value: fmtMoney(deposits) },
    { label: 'Withdrawals and other debits', value: `-${fmtMoney(withdrawals)}` },
    { label: 'Ending balance on January 31, 2026', value: `$${fmtMoney(closing)}` },
  ];
  builder.box(cursor.page, 40, boxTop, 290, 24 + summary.length * 13, SHADE, RULE);
  builder.text(cursor.page, 'Summary', 48, boxTop + 14, { size: 9, bold: true });
  summary.forEach((item, index) => {
    const baseline = boxTop + 30 + index * 13;
    const bold = index === summary.length - 1;
    builder.text(cursor.page, item.label, 48, baseline, { size: 8.5, bold });
    builder.textRight(cursor.page, item.value, 322, baseline, { size: 8.5, bold });
  });
  cursor = { page: cursor.page, y: boxTop + 24 + summary.length * 13 + 18 };
  cursor = builder.heading(cursor, 'Transaction detail');

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: 'Date', x: 40, align: 'left' },
      { key: 'desc', header: 'Description', x: 85, align: 'left' },
      { key: 'amount', header: 'Amount', x: 480, align: 'right' },
      { key: 'balance', header: 'Balance', x: 572, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 420,
    showHeader: true,
    continuedTitle: 'Transaction detail (continued)',
    carryForward: null,
    broughtForward: null,
  };
  const rows = sorted.map((t, index) =>
    plainRow({
      date: fmtMmDd(t.date),
      desc: must(t.lines[0], 'line'),
      amount: t.amountCents < 0 ? `-${fmtMoney(t.amountCents)}` : fmtMoney(t.amountCents),
      balance: fmtMoney(must(balances[index], 'balance')),
    }),
  );
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();

  return {
    expected: {
      name: 'us-signed-amount',
      description:
        'US checking: "01/05" mm/dd dates with no year (period January 1, 2026 through January 31, 2026), Date | Description | Amount | Balance with withdrawals as "-45.00". A Summary box (Beginning balance, Deposits and other credits, Withdrawals and other debits, Ending balance) sits above the table and must not become transactions. Card purchase descriptions contain their own mm/dd purchase date.',
      dateOrder: 'mdy',
      liabilityBalance: false,
      openingCents,
      closingCents: closing,
      transactions: sorted.map((t, index) => expectedRow(t, must(balances[index], 'balance'))),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceNeverNegative: true },
    notes: [`page breaks before rows ${result.pageStarts.join(', ') || '(none)'}`],
  };
}

/* ------------------------------------------------------------------ */
/* 4. Credit card without running balance                              */
/* ------------------------------------------------------------------ */

async function buildCreditCard(): Promise<FixtureOutput> {
  const rng = createRng(2025_12_15);
  const start = makeDate(2025, 12, 15);
  const end = makeDate(2026, 1, 14);
  const previousOwed = 128440;

  // amountCents follows the cardholder view: purchases negative, payments and refunds positive.
  const txns: Txn[] = [
    txn(makeDate(2025, 12, 22), ['PAYMENT RECEIVED - THANK YOU'], 128440),
    txn(makeDate(2026, 1, 5), ['ANNUAL MEMBERSHIP FEE'], -14900),
    txn(makeDate(2025, 12, 19), ['SKYLINE AIRWAYS 0420018877 ONLINE'], -114620),
  ];
  const foreign: [string, number, string][] = [
    ['CAFE DU PORT LYON FR', 2417, 'EUR'],
    ['MAPLE LEAF OUTFITTERS VANCOUVER CA', 8650, 'CAD'],
    ['TRATTORIA DEL PONTE FIRENZE IT', 6380, 'EUR'],
  ];
  const foreignDates = distinctDates(rng, makeDate(2025, 12, 27), makeDate(2026, 1, 8), foreign.length);
  foreign.forEach(([merchant, usdCents, currency], index) => {
    const date = must(foreignDates[index], 'foreign date');
    const rate = currency === 'EUR' ? 0.9187 : 1.3712;
    const original = Math.round(usdCents * rate);
    txns.push(txn(date, [merchant, `ORIGINAL AMOUNT ${currency} ${fmtMoney(original)}`], -usdCents));
    txns.push(txn(date, ['FOREIGN TRANSACTION FEE'], -Math.round(usdCents * 0.03)));
  });
  for (const date of scatterDates(rng, start, end, 27)) {
    const m = pick(rng, CARD_MERCHANTS);
    txns.push(txn(date, [`${m.name} ${m.place}`], -rng.int(m.minCents, m.maxCents)));
  }
  txns.push(txn(makeDate(2025, 12, 30), ['REFUND NORTHGATE PHARMACY SEATTLE WA'], 2399));
  txns.push(txn(makeDate(2026, 1, 10), ['REFUND PARCELPOST MARKETPLACE ONLINE'], 4875));

  const sorted = sortTxns(txns);
  const total = sorted.reduce((sum, t) => sum + t.amountCents, 0);
  const closingOwed = previousOwed - total;
  const credits = sumWhere(sorted, (t) => t.amountCents > 0);
  const fees = -sumWhere(sorted, (t) => t.lines[0] === 'ANNUAL MEMBERSHIP FEE' || t.lines[0] === 'FOREIGN TRANSACTION FEE');
  const purchases = -sumWhere(sorted, (t) => t.amountCents < 0) - fees;
  const limit = 800000;
  const minimum = Math.max(2500, Math.round(closingOwed * 0.02));

  const builder = await StatementBuilder.create(LETTER, {
    bankName: 'Contoso Card Services',
    tagline: 'Contoso Card Services  |  contoso-card.example  |  Contoso Rewards Card',
    title: 'Monthly Statement',
    holderLines: ['TAYLOR M EXAMPLE', '88 PLACEHOLDER LANE', 'RIVERTON ST 00000'],
    details: [
      { label: 'Card number', value: 'XXXX XXXX XXXX 3108' },
      { label: 'Statement period', value: 'Dec 15, 2025 - Jan 14, 2026' },
      { label: 'Payment due date', value: 'Feb 8, 2026' },
    ],
    continuationLine: 'Card ending 3108  |  Dec 15, 2025 - Jan 14, 2026',
    brandColour: rgb(0.45, 0.12, 0.42),
    disclaimer: 'Contoso Card Services. Paying only the minimum will increase the interest you pay. Synthetic test document.',
  });

  let cursor = builder.newPage();
  const top = cursor.y;
  const left: LabelValue[] = [
    { label: 'Previous balance', value: `$${fmtMoney(previousOwed)}` },
    { label: 'Payments and credits', value: `-$${fmtMoney(credits)}` },
    { label: 'Purchases', value: `+$${fmtMoney(purchases)}` },
    { label: 'Fees charged', value: `+$${fmtMoney(fees)}` },
    { label: 'Interest charged', value: '+$0.00' },
    { label: 'Closing balance', value: `$${fmtMoney(closingOwed)}` },
  ];
  const right: LabelValue[] = [
    { label: 'Closing balance', value: `$${fmtMoney(closingOwed)}` },
    { label: 'Minimum payment due', value: `$${fmtMoney(minimum)}` },
    { label: 'Payment due date', value: 'Feb 8, 2026' },
    { label: 'Credit limit', value: `$${fmtMoney(limit)}` },
    { label: 'Available credit', value: `$${fmtMoney(limit - closingOwed)}` },
  ];
  const boxHeight = 24 + left.length * 13;
  builder.box(cursor.page, 40, top, 262, boxHeight, SHADE, RULE);
  builder.box(cursor.page, 310, top, 262, boxHeight, SHADE, RULE);
  builder.text(cursor.page, 'Account summary', 48, top + 14, { size: 9, bold: true });
  builder.text(cursor.page, 'Payment information', 318, top + 14, { size: 9, bold: true });
  left.forEach((item, index) => {
    const baseline = top + 30 + index * 13;
    const bold = index === left.length - 1;
    builder.text(cursor.page, item.label, 48, baseline, { size: 8.5, bold });
    builder.textRight(cursor.page, item.value, 294, baseline, { size: 8.5, bold });
  });
  right.forEach((item, index) => {
    const baseline = top + 30 + index * 13;
    const bold = index === 0;
    builder.text(cursor.page, item.label, 318, baseline, { size: 8.5, bold });
    builder.textRight(cursor.page, item.value, 560, baseline, { size: 8.5, bold });
  });
  cursor = { page: cursor.page, y: top + boxHeight + 18 };
  cursor = builder.heading(cursor, 'Transactions');

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: 'Transaction date', x: 40, align: 'left' },
      { key: 'desc', header: 'Description', x: 125, align: 'left' },
      { key: 'amount', header: 'Amount', x: 572, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 470,
    showHeader: true,
    continuedTitle: 'Transactions (continued)',
    carryForward: null,
    broughtForward: null,
  };
  const rows = sorted.map((t) =>
    plainRow(
      {
        date: fmtMonDay(t.date),
        desc: must(t.lines[0], 'line'),
        amount: t.amountCents > 0 ? `${fmtMoney(t.amountCents)} CR` : fmtMoney(t.amountCents),
      },
      t.lines.slice(1),
    ),
  );
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();

  return {
    expected: {
      name: 'credit-card-no-running-balance',
      description:
        'Credit card: "Jan 05" dates across a Dec 2025 - Jan 2026 cycle, Transaction date | Description | Amount with no balance column. Purchases print as plain positive amounts (money out, so negative amountCents); payments and refunds print with a trailing " CR" (positive amountCents). Opening/closing are amounts owed from the summary boxes. Foreign purchases have a second description line such as "ORIGINAL AMOUNT EUR 22.20" (part of the description, not an amount), followed by a separate FOREIGN TRANSACTION FEE row.',
      dateOrder: 'mdy',
      liabilityBalance: true,
      openingCents: previousOwed,
      closingCents: closingOwed,
      transactions: sorted.map((t) => expectedRow(t, null)),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), minAmbiguousDates: 0 },
    notes: [`page breaks before rows ${result.pageStarts.join(', ') || '(none)'}`],
  };
}

/* ------------------------------------------------------------------ */
/* 5. Withdrawals / deposits with dollar signs and overdraft          */
/* ------------------------------------------------------------------ */

function harbourRandomTxn(rng: Rng, date: CalendarDate): Txn {
  const roll = rng.next();
  if (roll < 0.55) {
    const shop = pick(rng, ['Seaside Grocer Cairns', 'Reef Fuel Smithfield', 'Esplanade Pharmacy', 'Trinity Bay Bakery', 'Lagoon Fish Market']);
    return txn(date, [`Debit Card Purchase ${shop}`], -rng.int(650, 16800));
  }
  if (roll < 0.68) {
    const biller = pick(rng, ['Direct Debit Tropic Energy 772341', 'Direct Debit Coral Mobile 118204', 'BPAY Cairns Water 4417']);
    return txn(date, [biller], -rng.int(4800, 26500));
  }
  if (roll < 0.78) {
    return txn(date, ['ATM Withdrawal Esplanade Cairns'], -pick(rng, [4000, 10000, 20000]));
  }
  if (roll < 0.9) {
    return txn(date, [`Osko Deposit From ${pick(rng, ['M Example', 'K Placeholder', 'R Sample'])}`], rng.int(2000, 22000));
  }
  return txn(date, ['Internet Transfer To Holiday Saver'], -pick(rng, [10000, 25000, 50000]));
}

async function buildHarbour(): Promise<FixtureOutput> {
  const rng = createRng(2026_03_31);
  const openingCents = 41230;
  const txns: Txn[] = [
    txn(makeDate(2026, 1, 2), ['Rent - Bayview Property Mgmt'], -138000),
    txn(makeDate(2026, 1, 3), ['Overdrawn Account Fee'], -1500),
    txn(makeDate(2026, 2, 2), ['Rent - Bayview Property Mgmt'], -138000),
    txn(makeDate(2026, 3, 2), ['Rent - Bayview Property Mgmt'], -138000),
  ];
  for (let d = makeDate(2026, 1, 9); compareDates(d, makeDate(2026, 3, 31)) <= 0; d = addDays(d, 14)) {
    txns.push(txn(d, ['Payroll Deposit - Coastline Health'], 289015));
  }
  for (const date of scatterDates(rng, makeDate(2026, 1, 5), makeDate(2026, 3, 30), 32)) {
    txns.push(harbourRandomTxn(rng, date));
  }
  const sorted = sortTxns(txns);
  const balances = runningBalances(openingCents, sorted);
  const closing = must(balances[balances.length - 1], 'closing');
  const withdrawals = -sumWhere(sorted, (t) => t.amountCents < 0);
  const deposits = sumWhere(sorted, (t) => t.amountCents > 0);
  const dollars = (cents: number): string => (cents < 0 ? `($${fmtMoney(cents)})` : `$${fmtMoney(cents)}`);

  const builder = await StatementBuilder.create(A4, {
    bankName: 'Harbour Credit Union',
    tagline: 'Harbour Credit Union Ltd  |  harbourcu.example  |  Customer owned banking',
    title: 'Account Statement',
    holderLines: ['MR SAM EXAMPLE', 'UNIT 3 45 PLACEHOLDER PARADE', 'SAMPLETON QLD 4999'],
    details: [
      { label: 'Member number', value: '00418827' },
      { label: 'Account', value: 'S1 Everyday Account' },
      { label: 'Account number', value: '418827-S1' },
      { label: 'Statement period', value: '01/01/2026 - 31/03/2026' },
    ],
    continuationLine: 'S1 Everyday Account 418827-S1  |  01/01/2026 - 31/03/2026',
    brandColour: rgb(0.0, 0.47, 0.45),
    disclaimer: 'Harbour Credit Union Ltd. Report unauthorised transactions immediately. Synthetic test document.',
  });

  let cursor = builder.newPage();
  cursor = builder.heading(cursor, 'Account summary', 9);
  const summary: LabelValue[] = [
    { label: 'Opening balance', value: dollars(openingCents) },
    { label: 'Total withdrawals', value: dollars(withdrawals) },
    { label: 'Total deposits', value: dollars(deposits) },
    { label: 'Closing balance', value: dollars(closing) },
  ];
  summary.forEach((item, index) => {
    const baseline = cursor.y + 9 + index * 12;
    builder.text(cursor.page, item.label, 40, baseline, { size: 8.5 });
    builder.textRight(cursor.page, item.value, 300, baseline, { size: 8.5, bold: true });
  });
  cursor = { page: cursor.page, y: cursor.y + summary.length * 12 + 18 };
  cursor = builder.heading(cursor, 'Transaction listing');

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: 'Date', x: 40, align: 'left' },
      { key: 'desc', header: 'Description', x: 105, align: 'left' },
      { key: 'out', header: 'Withdrawals', x: 390, align: 'right' },
      { key: 'in', header: 'Deposits', x: 470, align: 'right' },
      { key: 'balance', header: 'Balance', x: 555, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 320,
    showHeader: true,
    continuedTitle: 'Transaction listing (continued)',
    carryForward: null,
    broughtForward: null,
  };
  const rows = sorted.map((t, index) =>
    plainRow({
      date: fmtDdMmYyyy(t.date),
      desc: must(t.lines[0], 'line'),
      out: t.amountCents < 0 ? `$${fmtMoney(t.amountCents)}` : '',
      in: t.amountCents > 0 ? `$${fmtMoney(t.amountCents)}` : '',
      balance: dollars(must(balances[index], 'balance')),
    }),
  );
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();
  const negativeRows = balances.filter((b) => b < 0).length;

  return {
    expected: {
      name: 'withdrawals-deposits-dollar-signs',
      description:
        'Credit union statement: "15/01/2026" dd/mm/yyyy dates, Date | Description | Withdrawals | Deposits | Balance with "$" and thousands separators. The account is overdrawn early on and negative balances print in parentheses, e.g. "($967.70)". Opening/closing come from an Account summary block above the table, not from table rows.',
      dateOrder: 'dmy',
      liabilityBalance: false,
      openingCents,
      closingCents: closing,
      transactions: sorted.map((t, index) => expectedRow(t, must(balances[index], 'balance'))),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceGoesNegative: true },
    notes: [`${negativeRows} rows with a negative (parenthesised) balance`, `page breaks before rows ${result.pageStarts.join(', ') || '(none)'}`],
  };
}

/* ------------------------------------------------------------------ */
/* 6. ISO dates, no column header, trailing minus                      */
/* ------------------------------------------------------------------ */

async function buildIso(): Promise<FixtureOutput> {
  const rng = createRng(2026_03_02);
  const start = makeDate(2026, 3, 1);
  const end = makeDate(2026, 3, 31);
  const openingCents = 451233;
  const txns: Txn[] = [
    txn(makeDate(2026, 3, 2), ['Rent HILLSIDE HOUSING MARCH'], -128500),
    txn(makeDate(2026, 3, 25), ['Salary payment TAILWIND TRADERS'], 341280),
    txn(makeDate(2026, 3, 27), ['Standing order TO SAVINGS POT'], -50000),
  ];
  for (const date of scatterDates(rng, makeDate(2026, 3, 2), makeDate(2026, 3, 30), 30)) {
    const roll = rng.next();
    if (roll < 0.6) {
      const shop = pick(rng, ['NORDIC BAKERY 4411', 'CITY MARKET HALL', 'HARBOURSIDE BOOKS', 'GREEN CORNER GROCERY', 'TRAM STOP KIOSK']);
      txns.push(txn(date, [`Card purchase ${shop}`], -rng.int(390, 12400)));
    } else if (roll < 0.75) {
      txns.push(txn(date, [pick(rng, ['Direct debit METRO TRANSIT PASS', 'Direct debit BRIGHTWAVE MOBILE', 'Direct debit CITY WATER AND POWER'])], -rng.int(2900, 18900)));
    } else if (roll < 0.85) {
      txns.push(txn(date, ['ATM withdrawal CENTRAL STATION'], -pick(rng, [4000, 10000])));
    } else {
      txns.push(txn(date, [`Transfer from ${pick(rng, ['R EXAMPLE', 'K SAMPLE', 'L PLACEHOLDER'])}`], rng.int(1500, 18000)));
    }
  }
  const sorted = sortTxns(txns);
  const balances = runningBalances(openingCents, sorted);
  const closing = must(balances[balances.length - 1], 'closing');
  const signed = (cents: number): string => (cents < 0 ? `${fmtMoney(cents)}-` : fmtMoney(cents));

  const builder = await StatementBuilder.create(A4, {
    bankName: 'Tailspin Savings Bank',
    tagline: 'Tailspin Savings Bank  |  tailspin.example',
    title: 'Account statement',
    holderLines: ['Robin Example', 'Placeholder Street 12', '0000 Sampleby'],
    details: [
      { label: 'Account', value: 'Everyday account' },
      { label: 'Account number', value: '8812-445190' },
      { label: 'Period', value: '2026-03-01 to 2026-03-31' },
    ],
    continuationLine: 'Account 8812-445190  |  2026-03-01 to 2026-03-31',
    brandColour: rgb(0.2, 0.36, 0.16),
    disclaimer: 'Tailspin Savings Bank. Amounts followed by a minus sign are debits. Synthetic test document.',
  });

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: '', x: 40, align: 'left' },
      { key: 'desc', header: '', x: 105, align: 'left' },
      { key: 'amount', header: '', x: 470, align: 'right' },
      { key: 'balance', header: '', x: 555, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 400,
    showHeader: false,
    continuedTitle: null,
    carryForward: null,
    broughtForward: null,
  };
  const rows: TableRow[] = [plainRow({ date: isoDate(start), desc: 'Opening balance', balance: fmtMoney(openingCents) })];
  sorted.forEach((t, index) => {
    rows.push(
      plainRow({
        date: isoDate(t.date),
        desc: must(t.lines[0], 'line'),
        amount: signed(t.amountCents),
        balance: fmtMoney(must(balances[index], 'balance')),
      }),
    );
  });
  rows.push(plainRow({ date: isoDate(end), desc: 'Closing balance', balance: fmtMoney(closing) }));

  let cursor = builder.newPage();
  cursor = builder.heading(cursor, 'Account activity');
  const result = builder.table(cursor, spec, rows);
  const pdf = await builder.finish();

  return {
    expected: {
      name: 'iso-no-header',
      description:
        'ISO "2026-03-02" dates with NO column header row. Each row is date, description, one signed amount and a balance; debits use a trailing minus ("45.00-"). Opening balance and Closing balance appear as dated table rows with only a balance.',
      dateOrder: 'ymd',
      liabilityBalance: false,
      openingCents,
      closingCents: closing,
      transactions: sorted.map((t, index) => expectedRow(t, must(balances[index], 'balance'))),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceNeverNegative: true },
    notes: [`page breaks before rows ${result.pageStarts.join(', ') || '(none)'}`],
  };
}

/* ------------------------------------------------------------------ */
/* 7. Mixed noise                                                      */
/* ------------------------------------------------------------------ */

function woodgroveRandomTxn(rng: Rng, date: CalendarDate): Txn {
  const roll = rng.next();
  if (roll < 0.5) {
    const shop = pick(rng, ['RIVERSIDE GROCER PENRITH', 'WESTGATE FUEL ST MARYS', 'PARKLANE CHEMIST PENRITH', 'GOLDEN WOK EMU PLAINS', 'MOUNTAIN VIEW NURSERY']);
    return txn(date, [`EFTPOS ${shop}`], -rng.int(550, 17500));
  }
  if (roll < 0.62) {
    const ref = digits(rng, 9);
    return txn(date, [`INTERNET TRANSFER TO ${ref}`, `REF ${pick(rng, ['HOLIDAY SAVINGS', 'SPLIT DINNER', 'CAR SERVICE'])}`], -rng.int(5000, 60000));
  }
  if (roll < 0.74) {
    return txn(date, [pick(rng, ['DIRECT DEBIT WESTERN ENERGY 55120', 'DIRECT DEBIT NBN PLAN 7781190', 'DIRECT DEBIT GYMWORKS 0091'])], -rng.int(2900, 31000));
  }
  if (roll < 0.84) {
    return txn(date, [`ATM WITHDRAWAL ${pick(rng, ['PENRITH PLAZA', 'ST MARYS STATION'])}`], -pick(rng, [5000, 10000, 20000]));
  }
  return txn(date, [`DEPOSIT ${pick(rng, ['A PLACEHOLDER', 'MEDICARE BENEFIT', 'B EXAMPLE RENT SHARE'])}`], rng.int(3000, 45000));
}

async function buildMixedNoise(): Promise<FixtureOutput> {
  const rng = createRng(2026_06_30);
  const start = makeDate(2026, 4, 1);
  const end = makeDate(2026, 6, 30);
  const openingCents = 726814;
  const txns: Txn[] = [];
  for (const [m, lastDay] of [
    [4, 30],
    [5, 31],
    [6, 30],
  ] as const) {
    txns.push(txn(makeDate(2026, m, 1), ['HOME LOAN REPAYMENT 0045812'], -231000));
    txns.push(txn(makeDate(2026, m, 15), ['SALARY WESTERN DISTRICT COUNCIL'], 612055));
    txns.push(txn(makeDate(2026, m, lastDay), ['CREDIT INTEREST'], rng.int(180, 640)));
  }
  for (const date of scatterDates(rng, makeDate(2026, 4, 2), makeDate(2026, 6, 29), 42)) {
    txns.push(woodgroveRandomTxn(rng, date));
  }
  const sorted = sortTxns(txns);
  const balances = runningBalances(openingCents, sorted);
  const closing = must(balances[balances.length - 1], 'closing');
  const debits = -sumWhere(sorted, (t) => t.amountCents < 0);
  const credits = sumWhere(sorted, (t) => t.amountCents > 0);
  const interest = sumWhere(sorted, (t) => t.lines[0] === 'CREDIT INTEREST');

  const builder = await StatementBuilder.create(A4, {
    bankName: 'Woodgrove Bank',
    tagline: 'Woodgrove Bank Ltd  |  woodgrove.example  |  Personal accounts',
    title: 'Transaction Statement',
    holderLines: ['MRS LEE PLACEHOLDER', '9 SAMPLE CLOSE', 'EXAMPLE HEIGHTS NSW 2999'],
    details: [
      { label: 'Account', value: 'Streamline Account' },
      { label: 'Account number', value: '3301 774 211' },
      { label: 'Statement period', value: '01/04/26 to 30/06/26' },
      { label: 'Enquiries', value: '(02) 5550 1234' },
    ],
    continuationLine: 'Streamline Account 3301 774 211  |  01/04/26 to 30/06/26',
    brandColour: rgb(0.62, 0.1, 0.12),
    disclaimer: 'Woodgrove Bank Ltd. Please retain this statement for taxation purposes. Synthetic test document.',
  });

  let cursor = builder.newPage();
  // Promotional box with percentages, a money amount and a phone number.
  const promo = [
    'NEW: Woodgrove Bonus Saver. Earn 4.50% p.a. variable when you deposit $1,000.00 or more each month',
    'and make no withdrawals. Base rate 0.10% p.a. Rates current as at 01/04/26 and subject to change.',
    'Call us on (02) 5550 1234, 8am to 8pm, 7 days, or visit woodgrove.example to apply today.',
  ];
  builder.box(cursor.page, 40, cursor.y, A4.width - 80, 14 + promo.length * 11, SHADE, RULE);
  promo.forEach((line, index) => {
    builder.text(cursor.page, line, 48, cursor.y + 13 + index * 11, { size: 7.5, bold: index === 0 });
  });
  cursor = { page: cursor.page, y: cursor.y + 14 + promo.length * 11 + 16 };
  cursor = builder.heading(cursor, 'Transaction history');

  const spec: TableSpec = {
    columns: [
      { key: 'date', header: 'Date', x: 40, align: 'left' },
      { key: 'desc', header: 'Details', x: 90, align: 'left' },
      { key: 'debit', header: 'Debit', x: 390, align: 'right' },
      { key: 'credit', header: 'Credit', x: 465, align: 'right' },
      { key: 'balance', header: 'Balance', x: 555, align: 'right' },
    ],
    descriptionKey: 'desc',
    descriptionMaxX: 325,
    showHeader: true,
    continuedTitle: 'Transaction history (continued)',
    carryForward: null,
    broughtForward: null,
  };
  const rows: TableRow[] = [plainRow({ date: fmtDdMmYy(start), desc: 'OPENING BALANCE', balance: fmtMoney(openingCents) })];
  sorted.forEach((t, index) => {
    const amount = fmtMoney(t.amountCents);
    rows.push(
      plainRow(
        {
          date: fmtDdMmYy(t.date),
          desc: must(t.lines[0], 'line'),
          debit: t.amountCents < 0 ? amount : '',
          credit: t.amountCents > 0 ? amount : '',
          balance: fmtMoney(must(balances[index], 'balance')),
        },
        t.lines.slice(1),
      ),
    );
  });
  rows.push(plainRow({ desc: 'Total debits / Total credits', debit: fmtMoney(debits), credit: fmtMoney(credits) }));
  rows.push(plainRow({ date: fmtDdMmYy(end), desc: 'CLOSING BALANCE', balance: fmtMoney(closing) }));
  const result = builder.table(cursor, spec, rows);
  cursor = result.cursor;

  // Interest rate table: tier ranges contain money-looking values.
  cursor = builder.ensureSpace({ page: cursor.page, y: cursor.y + 16 }, 110);
  cursor = builder.heading(cursor, 'Interest rates applying to your account', 9);
  const tiers: LabelValue[] = [
    { label: '$0.00 - $4,999.99', value: '0.05%' },
    { label: '$5,000.00 - $49,999.99', value: '0.25%' },
    { label: '$50,000.00 and over', value: '0.85%' },
  ];
  builder.text(cursor.page, 'Balance tier', 40, cursor.y + 8, { size: 8, bold: true });
  builder.textRight(cursor.page, 'Rate p.a.', 250, cursor.y + 8, { size: 8, bold: true });
  tiers.forEach((tier, index) => {
    const baseline = cursor.y + 20 + index * 11;
    builder.text(cursor.page, tier.label, 40, baseline, { size: 8 });
    builder.textRight(cursor.page, tier.value, 250, baseline, { size: 8 });
  });
  cursor = { page: cursor.page, y: cursor.y + 20 + tiers.length * 11 + 4 };
  cursor = builder.paragraph(cursor, [`Interest is calculated daily and paid monthly. Total credit interest this period: $${fmtMoney(interest)}.`]);

  // A page with no transactions at all.
  cursor = builder.newPage();
  cursor = builder.heading(cursor, 'Important information about your account');
  builder.paragraph(cursor, [
    'Please check the entries on this statement carefully. If you think there is an error or an unauthorised',
    'transaction, tell us within 60 days of the statement date by calling (02) 5550 1234.',
    '',
    'Fees. A dishonour fee of $9.00 applies to each direct debit we cannot pay. An overdrawn account fee of',
    '$15.00 may apply on any day your account is overdrawn by more than $10.00.',
    '',
    'Interest. Credit interest is calculated on the daily closing balance and credited on the last business day',
    'of each month. Rates are variable and may change at any time. Current rates are set out above.',
    '',
    'Complaints. If you are not satisfied with our response you may contact the Example Financial Complaints',
    'Authority, GPO Box 0000, Sampleton 0000, telephone 1800 555 010.',
    '',
    'Fees and charges are set out in our Product Disclosure Statement version 4.2 dated 01/03/2026.',
    'Woodgrove Bank Ltd ABN 00 000 000 000 AFSL 000000.',
  ]);
  const pdf = await builder.finish();

  return {
    expected: {
      name: 'mixed-noise',
      description:
        'dd/mm/yy dates, Date | Details | Debit | Credit | Balance, surrounded by noise that must be ignored: a promotional box ("Earn 4.50% p.a.", "$1,000.00", phone number), OPENING/CLOSING BALANCE rows, a "Total debits / Total credits" row with sums in the Debit and Credit columns, an interest rate tier table with dollar ranges, and a final terms and conditions page with no transactions.',
      dateOrder: 'dmy',
      liabilityBalance: false,
      openingCents,
      closingCents: closing,
      transactions: sorted.map((t, index) => expectedRow(t, must(balances[index], 'balance'))),
    },
    pdf,
    pages: builder.pages.length,
    checks: { ...defaultChecks(), balanceNeverNegative: true },
    notes: [`page breaks before rows ${result.pageStarts.join(', ') || '(none)'}; last page is terms only`],
  };
}

/* ------------------------------------------------------------------ */
/* 8. Image-only (no text layer)                                       */
/* ------------------------------------------------------------------ */

async function buildImageOnly(): Promise<FixtureOutput> {
  const rng = createRng(8);
  const doc = await PDFDocument.create({ updateMetadata: false });
  const { width, height } = A4;
  const page = doc.addPage([width, height]);
  const ink = rgb(0.22, 0.22, 0.24);
  const faint = rgb(0.55, 0.55, 0.57);
  const bar = (x: number, top: number, w: number, h: number, colour: Color): void => {
    page.drawRectangle({ x, y: height - top - h, width: w, height: h, color: colour });
  };

  // Off-white "paper" with a slightly grey scanner edge.
  bar(0, 0, width, height, rgb(0.96, 0.955, 0.94));
  bar(0, 0, 6, height, rgb(0.8, 0.8, 0.79));
  // Logo block and bank name.
  bar(40, 30, 34, 34, ink);
  bar(82, 36, 140, 11, ink);
  bar(82, 52, 90, 5, faint);
  // Holder address and account details.
  for (let i = 0; i < 3; i += 1) {
    bar(40, 92 + i * 12, rng.int(90, 150), 6, ink);
    bar(340, 82 + i * 12, 60, 5, faint);
    bar(410, 82 + i * 12, rng.int(70, 130), 5, ink);
  }
  // Table header band and rows.
  bar(36, 150, width - 72, 14, rgb(0.85, 0.85, 0.85));
  for (const x of [40, 88, 360, 430, 510]) {
    bar(x, 154, 30, 6, ink);
  }
  for (let row = 0; row < 34; row += 1) {
    const top = 174 + row * 17;
    bar(40, top, 26, 6, ink);
    bar(88, top, rng.int(110, 220), 6, ink);
    const amountWidth = rng.int(26, 40);
    bar(rng.chance(0.75) ? 390 - amountWidth : 465 - amountWidth, top, amountWidth, 6, ink);
    bar(555 - 46, top, 46, 6, ink);
    page.drawLine({
      start: { x: 40, y: height - top - 10 },
      end: { x: width - 40, y: height - top - 10 },
      thickness: 0.3,
      color: rgb(0.8, 0.8, 0.8),
    });
  }
  // Footer.
  bar(40, height - 40, 260, 5, faint);
  bar(width - 90, height - 40, 50, 5, faint);
  const pdf = await finaliseDocument(doc, 'Scanned statement', 'Example Bank');

  return {
    expected: {
      name: 'image-only',
      description:
        'A scanned-looking statement with no text layer at all (only filled rectangles and lines). The converter should extract no transactions and report that the PDF has no readable text (needs OCR).',
      dateOrder: 'dmy',
      liabilityBalance: false,
      openingCents: null,
      closingCents: null,
      transactions: [],
    },
    pdf,
    pages: doc.getPageCount(),
    checks: { ...defaultChecks(), expectTransactions: false },
    notes: ['no text drawn'],
  };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const AU_DESCRIPTION =
  'Australian transaction account: "03 Dec" dates with no year over a 1 Dec 2025 to 28 Feb 2026 period (year rolls over), Date | Transaction details | Debit | Credit | Balance with balances printed as "1,234.56 CR". OPENING BALANCE and CLOSING BALANCE rows, descriptions that wrap onto a continuation line (no date or amount; some contain "Value Date: dd/mm/yyyy"), and "Balance carried forward" / "Balance brought forward" rows at page breaks.';

const BUILDERS: readonly (() => Promise<FixtureOutput>)[] = [
  () =>
    buildAuStatement({
      name: 'au-debit-credit-balance',
      description: AU_DESCRIPTION,
      seed: 2025_12_01,
      holderLines: ['MS JANE Q CITIZEN', 'UNIT 7 12 EXAMPLE STREET', 'SAMPLEVILLE NSW 2999'],
      accountNumber: '1234 5678',
      openingCents: 481237,
      misprint: false,
    }),
  buildUk,
  buildUs,
  buildCreditCard,
  buildHarbour,
  buildIso,
  buildMixedNoise,
  buildImageOnly,
  () =>
    buildAuStatement({
      name: 'au-with-misprint',
      description: `${AU_DESCRIPTION} One printed balance (see mismatchDates) is deliberately 10.00 too high; balanceCents keeps the wrong printed value and every later balance is correct again.`,
      seed: 2026_02_28,
      holderLines: ['MR CHRIS EXAMPLE', '22 PLACEHOLDER AVENUE', 'SAMPLEVILLE NSW 2999'],
      accountNumber: '8765 4321',
      openingCents: 352118,
      misprint: true,
    }),
];

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const build of BUILDERS) {
    const output = await build();
    validate(output);
    const { name } = output.expected;
    writeFileSync(new URL(`${name}.pdf`, OUTPUT_DIR), output.pdf);
    writeFileSync(new URL(`${name}.expected.json`, OUTPUT_DIR), `${JSON.stringify(output.expected, null, 2)}\n`);
    console.log(`${name}: ${output.expected.transactions.length} transactions, ${output.pages} page(s). ${output.notes.join('; ')}`);
  }
}

await main();
