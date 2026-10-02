/**
 * Regression tests for layout patterns seen in real published sample
 * statements. The text is rebuilt synthetically so no third-party PDF is kept.
 */
import { describe, expect, it } from 'vitest';
import { convertStatement } from '../../src/engine/convert.ts';
import type { PageText, PositionedText } from '../../src/engine/types.ts';

const CHAR = 4.6;
const HEIGHT = 9;

/** Left-aligned text starting at x. */
function text(value: string, x: number, y: number): PositionedText {
  return { text: value, x, y, width: value.length * CHAR, height: HEIGHT };
}

/** Right-aligned text ending at `right`, as money columns are printed. */
function right(value: string, rightEdge: number, y: number): PositionedText {
  const width = value.length * CHAR;
  return { text: value, x: rightEdge - width, y, width, height: HEIGHT };
}

function page(items: PositionedText[]): PageText[] {
  return [{ pageNumber: 1, width: 612, height: 792, items }];
}

describe('real-world layout patterns', () => {
  it('reads amounts without a leading zero and lines starting with "Interest paid"', () => {
    const items = [
      text('From March 12, 2004 to April 12, 2004', 400, 60),
      text('Date', 33, 100),
      text('Description', 77, 100),
      right('Withdrawals ($)', 371, 100),
      right('Deposits ($)', 461, 100),
      right('Balance ($)', 582, 100),
      text('Opening balance', 77, 114),
      right('4,247.14', 582, 114),
      text('15 Mar', 33, 128),
      text('Transfer', 77, 128),
      right('85.00', 461, 128),
      text('Interest paid', 77, 142),
      right('.15', 461, 142),
      text('ATM withdrawal', 77, 156),
      right('100.00', 371, 156),
      right('4,232.29', 582, 156),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.description, t.amountCents, t.status])).toEqual([
      ['Transfer', 8500, 'verified-group'],
      ['Interest paid', 15, 'verified-group'],
      ['ATM withdrawal', -10000, 'verified-group'],
    ]);
  });

  it('joins a description centred vertically around the amounts row and ignores dash placeholders', () => {
    const items = [
      text('Statement Period: July 1, 2023 - July 31, 2023', 72, 40),
      text('Date', 96, 80),
      text('Description', 188, 80),
      right('Withdrawals', 377, 80),
      right('Deposits', 451, 80),
      right('Balance', 526, 80),
      text('07/01/2023', 77, 100),
      text('Opening Balance', 151, 100),
      text('-', 302, 100),
      text('-', 392, 100),
      right('$5,000.00', 524, 100),
      text('07/30/2023', 77, 140),
      text('Gym Membership Fee', 151, 140),
      right('$80.00', 339, 140),
      text('-', 392, 140),
      right('$4,920.00', 524, 140),
      text('Movie Streaming Service', 151, 170),
      text('07/31/2023', 77, 181),
      right('$50.00', 339, 181),
      text('-', 392, 181),
      right('$4,870.00', 524, 181),
      text('Subscription', 151, 192),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.date, t.description, t.amountCents, t.status])).toEqual([
      ['2023-07-30', 'Gym Membership Fee', -8000, 'verified'],
      ['2023-07-31', 'Movie Streaming Service Subscription', -5000, 'verified'],
    ]);
  });

  it('ignores trailing tables of dates and figures, and picks the opening balance that fits', () => {
    const items = [
      text('Previous balance', 44, 60),
      text('06/28/2019', 148, 60),
      right('$3,005.93', 287, 60),
      text('Date', 44, 100),
      text('Description', 95, 100),
      right('Debits', 393, 100),
      right('Credits', 480, 100),
      right('Balance', 566, 100),
      text('06/28/2019', 44, 114),
      text('Previous Balance', 95, 114),
      right('$445.28', 566, 114),
      text('07/01/2019', 44, 128),
      text('Deposit', 95, 128),
      right('209.54', 480, 128),
      right('654.82', 566, 128),
      text('07/03/2019', 44, 142),
      text('ACH DEBIT SETTLEMENT', 95, 142),
      right('714.56', 393, 142),
      right('-59.74', 566, 142),
      text('DAILY BALANCE SUMMARY', 44, 200),
      text('07/01', 44, 214),
      right('14,234.07', 174, 214),
      text('07/15/2019', 237, 214),
      right('7,285.72', 366, 214),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions).toHaveLength(2);
    expect(r.balance.openingCents).toBe(44528);
    expect(r.transactions.every((t) => t.status === 'verified')).toBe(true);
  });

  it('reads the opening and closing figures from side-by-side summary boxes', () => {
    const items = [
      text('Statement period Dec 3, 2025 - Jan 2, 2026', 40, 30),
      text('Previous balance', 40, 60),
      right('$100.00', 200, 60),
      text('Closing balance', 300, 60),
      right('$130.00', 560, 60),
      text('Date', 40, 100),
      text('Description', 120, 100),
      right('Amount', 572, 100),
      text('Dec 05', 40, 114),
      text('BOOKSHOP', 120, 114),
      right('50.00', 572, 114),
      text('Dec 20', 40, 128),
      text('PAYMENT THANK YOU', 120, 128),
      right('20.00 CR', 572, 128),
    ];
    const r = convertStatement(page(items));
    expect(r.balance.openingCents).toBe(10000);
    expect(r.balance.closingCents).toBe(13000);
    expect(r.liabilityBalance).toBe(true);
    expect(r.transactions.map((t) => t.amountCents)).toEqual([-5000, 2000]);
    expect(r.balance.totalsMatch).toBe(true);
  });
});
