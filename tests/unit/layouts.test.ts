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

function pages(...itemsByPage: PositionedText[][]): PageText[] {
  return itemsByPage.map((items, i) => ({ pageNumber: i + 1, width: 612, height: 792, items }));
}

/** A "Date | Transaction description | Debit | Credit | Balance" header as business statements print it. */
function businessHeader(y: number): PositionedText[] {
  return [
    text('DATE', 67, y),
    text('TRANSACTION DESCRIPTION', 115, y),
    right('DEBIT', 393, y),
    right('CREDIT', 475, y),
    right('BALANCE', 542, y),
  ];
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

  it('reads a transaction whose date starts one line and whose amounts end the next', () => {
    const items = [
      text('Statement Period', 312, 34),
      text('1 March 2026 - 31 March 2026', 312, 46),
      ...businessHeader(100),
      text('01/03/26', 67, 120),
      text('STATEMENT OPENING BALANCE', 115, 120),
      right('1,200.00', 542, 120),
      text('02/03/26', 67, 134),
      text('Deposit 0427 Bpay 7300951', 115, 134),
      text('Ref Abc123', 115, 148),
      right('150.00', 475, 148),
      right('1,350.00', 542, 148),
      text('02/03/26', 67, 162),
      text('Account Keeping Fee', 115, 162),
      right('10.00', 393, 162),
      right('1,340.00', 542, 162),
      text('03/03/26', 67, 176),
      text('Direct Debit To Insurer', 115, 176),
      text('Policy 8841', 115, 190),
      right('340.00', 393, 190),
      right('1,000.00', 542, 190),
      text('03/03/26', 67, 204),
      text('CLOSING BALANCE', 115, 204),
      right('1,000.00', 542, 204),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.date, t.description, t.amountCents, t.status])).toEqual([
      ['2026-03-02', 'Deposit 0427 Bpay 7300951 Ref Abc123', 15000, 'verified'],
      ['2026-03-02', 'Account Keeping Fee', -1000, 'verified'],
      ['2026-03-03', 'Direct Debit To Insurer Policy 8841', -34000, 'verified'],
    ]);
    expect(r.balance).toEqual({ openingCents: 120000, closingCents: 100000, totalsMatch: true });
  });

  it('reads a statement whose only transaction runs over three lines', () => {
    const items = [
      ...businessHeader(100),
      text('30/06/26', 67, 120),
      text('OPENING BALANCE', 115, 120),
      right('4,000.00', 542, 120),
      text('08/08/26', 67, 134),
      text('Deposit-Transfer 4471 Riverton', 115, 134),
      text('Hall Hire Instalments for', 115, 148),
      text('Booking 7 Series 004', 115, 162),
      right('2,615.40', 475, 162),
      right('6,615.40', 542, 162),
      text('29/08/26', 67, 176),
      text('CLOSING BALANCE', 115, 176),
      right('6,615.40', 542, 176),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.date, t.description, t.amountCents, t.status])).toEqual([
      ['2026-08-08', 'Deposit-Transfer 4471 Riverton Hall Hire Instalments for Booking 7 Series 004', 261540, 'verified'],
    ]);
    expect(r.balance).toEqual({ openingCents: 400000, closingCents: 661540, totalsMatch: true });
  });

  it('verifies a file that holds several consecutive statements of one account', () => {
    const first = [
      ...businessHeader(100),
      text('01/01/26', 67, 120),
      text('STATEMENT OPENING BALANCE', 115, 120),
      right('500.00', 542, 120),
      text('02/01/26', 67, 134),
      text('Coffee Shop', 115, 134),
      right('4.50', 393, 134),
      right('495.50', 542, 134),
      text('02/01/26', 67, 148),
      text('CLOSING BALANCE', 115, 148),
      right('495.50', 542, 148),
    ];
    const second = (opening: string, balance: string): PositionedText[] => [
      text('Opening Balance', 312, 60),
      right(`+ $${opening}`, 541, 60),
      text('Closing Balance', 312, 74),
      right(`+ $${balance}`, 541, 74),
      ...businessHeader(100),
      text('03/01/26', 67, 120),
      text('STATEMENT OPENING BALANCE', 115, 120),
      right(opening, 542, 120),
      text('05/01/26', 67, 134),
      text('Salary Credit', 115, 134),
      right('100.00', 475, 134),
      right(balance, 542, 134),
      text('05/01/26', 67, 148),
      text('CLOSING BALANCE', 115, 148),
      right(balance, 542, 148),
    ];

    const joined = convertStatement(pages(first, second('495.50', '595.50')));
    expect(joined.transactions.map((t) => [t.amountCents, t.status])).toEqual([
      [-450, 'verified'],
      [10000, 'verified'],
    ]);
    expect(joined.balance).toEqual({ openingCents: 50000, closingCents: 59550, totalsMatch: true });
    expect(joined.warnings).toEqual([]);

    // The second statement does not start where the first ended: rows still verify, and the gap is reported.
    const gap = convertStatement(pages(first, second('600.00', '700.00')));
    expect(gap.transactions.map((t) => [t.amountCents, t.status])).toEqual([
      [-450, 'verified'],
      [10000, 'verified'],
    ]);
    expect(gap.warnings.some((w) => /does not match the balance before it/.test(w))).toBe(true);
    expect(gap.balance.totalsMatch).toBe(false);
  });

  it('ignores a summary box repeated on a continuation page when the rows carry on from the balance before it', () => {
    const first = [
      ...businessHeader(100),
      text('01/02/26', 67, 120),
      text('STATEMENT OPENING BALANCE', 115, 120),
      right('1,000.00', 542, 120),
      text('01/02/26', 67, 134),
      text('Shop A', 115, 134),
      right('100.00', 393, 134),
      right('900.00', 542, 134),
      text('02/02/26', 67, 148),
      text('Shop B', 115, 148),
      right('50.00', 393, 148),
      right('850.00', 542, 148),
    ];
    const second = [
      text('Opening Balance', 312, 60),
      right('+ $1,000.00', 541, 60),
      text('Closing Balance', 312, 74),
      right('+ $700.00', 541, 74),
      ...businessHeader(100),
      text('03/02/26', 67, 120),
      text('Shop C', 115, 120),
      right('150.00', 393, 120),
      right('700.00', 542, 120),
      text('03/02/26', 67, 134),
      text('CLOSING BALANCE', 115, 134),
      right('700.00', 542, 134),
    ];
    const r = convertStatement(pages(first, second));
    expect(r.transactions.map((t) => t.status)).toEqual(['verified', 'verified', 'verified']);
    expect(r.balance).toEqual({ openingCents: 100000, closingCents: 70000, totalsMatch: true });
    expect(r.warnings).toEqual([]);
  });

  it('names a balance column for each layout when a file holds statements from two banks', () => {
    const first = [
      ...businessHeader(100),
      text('01/01/26', 67, 120),
      text('STATEMENT OPENING BALANCE', 115, 120),
      right('500.00', 542, 120),
      text('02/01/26', 67, 134),
      text('Rent Received', 115, 134),
      right('200.00', 475, 134),
      right('700.00', 542, 134),
      text('03/01/26', 67, 148),
      text('Card Fee', 115, 148),
      right('5.00', 393, 148),
      right('695.00', 542, 148),
    ];
    const second = [
      text('Date', 46, 100),
      text('Transaction', 105, 100),
      right('Withdrawals', 423, 100),
      right('Deposits', 497, 100),
      right('Balance', 570, 100),
      text('Opening balance', 46, 120),
      right('3,000.00', 570, 120),
      text('1 Feb 26', 46, 134),
      text('Monthly Fee', 105, 134),
      right('10.00', 423, 134),
      right('2,990.00', 570, 134),
      text('2 Feb 26', 46, 148),
      text('Interest', 105, 148),
      right('0.50', 497, 148),
      right('2,990.50', 570, 148),
    ];
    const r = convertStatement(pages(first, second));
    expect(r.columns.filter((c) => c.role === 'balance')).toHaveLength(2);
    expect(r.transactions.map((t) => [t.amountCents, t.balanceCents, t.status])).toEqual([
      [20000, 70000, 'verified'],
      [-500, 69500, 'verified'],
      [-1000, 299000, 'verified'],
      [50, 299050, 'verified'],
    ]);
    expect(r.warnings.some((w) => /more than one statement or account/.test(w))).toBe(true);
  });

  it('drops "blank" placeholders and takes the closing balance from a totals line', () => {
    const items = [
      text('14 AUGUST 2026 TO 13 SEPTEMBER 2026', 373, 40),
      text('Date', 43, 100),
      text('Transaction Details', 77, 100),
      right('Withdrawals ($)', 392, 100),
      right('Deposits ($)', 467, 100),
      right('Balance ($)', 561, 100),
      text('14 AUG', 43, 120),
      text('OPENING BALANCE', 77, 120),
      right('1,000.00', 561, 120),
      text('19 AUG', 43, 134),
      text('TRANSFER', 77, 134),
      text('blank', 378, 134),
      right('23.75', 467, 134),
      right('1,023.75', 561, 134),
      text('CARD SETTLEMENT', 77, 144),
      text('03 SEP', 43, 158),
      text('PAYMENT', 77, 158),
      right('40.20', 392, 158),
      text('blank', 453, 158),
      right('983.55', 561, 158),
      text('TOTALS AT END OF PERIOD', 77, 180),
      right('$40.20', 392, 180),
      right('$23.75', 467, 180),
      right('$983.55', 561, 180),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.date, t.description, t.amountCents, t.status])).toEqual([
      ['2026-08-19', 'TRANSFER CARD SETTLEMENT', 2375, 'verified'],
      ['2026-09-03', 'PAYMENT', -4020, 'verified'],
    ]);
    expect(r.balance).toEqual({ openingCents: 100000, closingCents: 98355, totalsMatch: true });
  });

  it('starts a fresh check when a second table begins below the first on the same page', () => {
    const header = (y: number): PositionedText[] => [
      text('Date', 40, y),
      text('Transaction Details', 81, y),
      right('Deposit', 333, y),
      right('Withdrawal', 405, y),
      right('Balance', 549, y),
    ];
    const items = [
      text('Savings Account 001', 40, 80),
      ...header(100),
      text('01 Sep 2026', 40, 120),
      text('Balance brought forward', 81, 120),
      right('1,000.00', 549, 120),
      text('02 Sep 2026', 40, 134),
      text('Grocery Store', 81, 134),
      right('60.00', 405, 134),
      right('940.00', 549, 134),
      text('Total Withdrawal Amount: 60.00', 40, 160),
      text('Savings Account 002', 40, 190),
      ...header(210),
      text('03 Sep 2026', 40, 230),
      text('Pay Received', 81, 230),
      right('250.00', 333, 230),
      right('5,250.00', 549, 230),
      text('04 Sep 2026', 40, 244),
      text('Phone Bill', 81, 244),
      right('50.00', 405, 244),
      right('5,200.00', 549, 244),
    ];
    const r = convertStatement(page(items));
    expect(r.transactions.map((t) => [t.description, t.amountCents, t.status])).toEqual([
      ['Grocery Store', -6000, 'verified'],
      ['Pay Received', 25000, 'unchecked'],
      ['Phone Bill', -5000, 'verified'],
    ]);
    expect(r.summary.mismatched).toBe(0);
  });
});
