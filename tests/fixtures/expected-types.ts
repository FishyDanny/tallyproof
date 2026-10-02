/**
 * Shape of the ground-truth files (`<name>.expected.json`) that sit next to
 * each generated statement PDF in `tests/fixtures/`.
 *
 * Money follows the engine convention in `src/engine/types.ts`: integer cents,
 * money into the account positive, money out of the account negative.
 */

import type { DateOrder } from '../../src/engine/types.ts';

/** One transaction row as a correct converter should emit it. */
export interface ExpectedTransaction {
  /** ISO date, yyyy-mm-dd. Rows with a blank date cell inherit the date above. */
  date: string;
  /**
   * Full description exactly as printed: trimmed, single spaces, and wrapped
   * continuation lines joined to the first line with one space.
   */
  description: string;
  /** Signed amount in cents: positive = money in, negative = money out. */
  amountCents: number;
  /**
   * Balance printed on this row in cents, or null when the row has no printed
   * balance (blank cell or no balance column). Kept as printed, even when the
   * statement prints a wrong value (see `mismatchDates`).
   */
  balanceCents: number | null;
}

/** Ground truth for one fixture statement. */
export interface ExpectedFixture {
  /** Fixture base name; the PDF is `<name>.pdf`. */
  name: string;
  /** What this layout is designed to test. */
  description: string;
  dateOrder: DateOrder;
  /** True for credit cards, where the printed balance is an amount owed. */
  liabilityBalance: boolean;
  /**
   * Opening balance in cents as printed, or null when the statement has none.
   * For liability statements this is the amount owed, as a positive number.
   */
  openingCents: number | null;
  /** Closing balance in cents as printed, or null. Same convention as openingCents. */
  closingCents: number | null;
  transactions: ExpectedTransaction[];
  /** Dates (yyyy-mm-dd) of rows whose printed balance is deliberately wrong. */
  mismatchDates?: string[];
}
