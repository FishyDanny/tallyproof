/**
 * Core types for the statement conversion engine.
 *
 * Money is always held as integer cents to avoid floating point drift.
 * Sign convention for `amountCents`: money into the account is positive,
 * money out of the account is negative (as seen by the account holder).
 */

/** A single run of text placed on a PDF page. Coordinates use a top-left origin. */
export interface PositionedText {
  text: string;
  /** Left edge in PDF points. */
  x: number;
  /** Baseline distance from the top of the page in PDF points. */
  y: number;
  width: number;
  height: number;
}

export interface PageText {
  pageNumber: number;
  width: number;
  height: number;
  items: PositionedText[];
}

/** Adjacent text items merged into one visually separate cell on a line. */
export interface Cell {
  text: string;
  x0: number;
  x1: number;
}

export interface Line {
  page: number;
  y: number;
  height: number;
  cells: Cell[];
  /** All cell text joined with single spaces. */
  text: string;
}

export type ColumnRole = 'debit' | 'credit' | 'amount' | 'balance' | 'ignore';

/** A group of vertically aligned money values, keyed by their right edge. */
export interface AmountColumn {
  id: number;
  /** Representative right edge (x1) of values in this column. */
  right: number;
  role: ColumnRole;
  /** How the role was decided, shown to the user when it matters. */
  source: 'header' | 'balance-delta' | 'position' | 'user';
}

export type DateOrder = 'dmy' | 'mdy' | 'ymd';

export type RowStatus =
  /** Previous balance plus this amount equals the printed balance. */
  | 'verified'
  /** Part of a group of rows whose combined movement matches the next printed balance. */
  | 'verified-group'
  /** The printed balance does not match. The row needs a human check. */
  | 'mismatch'
  /** No printed balance was available to check against. */
  | 'unchecked';

/** The sum behind a row whose printed balance does not match, shown beside that balance. */
export interface RowArithmetic {
  /** Balance before this row: the opening balance, or the previous balance plus any rows between. */
  previousCents: number;
  /** How this row moves the balance: the amount, reversed for a credit card or loan. */
  effectCents: number;
  /** previousCents + effectCents: the balance the statement should have printed. */
  expectedCents: number;
}

export interface Transaction {
  /** ISO date, yyyy-mm-dd. */
  date: string;
  description: string;
  /** Signed amount in cents: positive = money in, negative = money out. */
  amountCents: number;
  /** Running balance printed on the statement for this row, in cents, if any. */
  balanceCents: number | null;
  page: number;
  status: RowStatus;
  /** Raw text of the source line(s), for display when a row needs checking. */
  source: string;
  /** Present on a row with a printed balance that does not match: the sum it was checked with. */
  arithmetic?: RowArithmetic;
}

export interface BalanceCheck {
  openingCents: number | null;
  closingCents: number | null;
  /** True when opening + sum(amounts) === closing. Null when either end is unknown. */
  totalsMatch: boolean | null;
}

export interface ConversionSummary {
  transactions: number;
  verified: number;
  mismatched: number;
  unchecked: number;
  /** Total money in, in cents (positive). */
  moneyInCents: number;
  /** Total money out, in cents (positive number). */
  moneyOutCents: number;
}

export interface ConversionResult {
  transactions: Transaction[];
  balance: BalanceCheck;
  summary: ConversionSummary;
  columns: AmountColumn[];
  dateOrder: DateOrder;
  /** True when the statement's running balance behaves like a liability (credit cards, loans). */
  liabilityBalance: boolean;
  warnings: string[];
}

/** Options a user can override when automatic detection gets something wrong. */
export interface ConversionOptions {
  /** Force a date order instead of detecting it. Undefined means detect. */
  dateOrder?: DateOrder | undefined;
  /** Override detected column roles, keyed by AmountColumn.id. */
  columnRoles?: Record<number, ColumnRole> | undefined;
}
