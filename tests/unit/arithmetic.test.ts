import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertStatement } from '../../src/engine/convert.ts';
import { displayArithmetic } from '../../src/engine/money.ts';
import { pagesFromFile } from '../helpers/pdf-node.ts';

const fixtures = join(import.meta.dirname, '..', 'fixtures');

describe('the sum behind a row that needs checking', () => {
  it('is the previous balance plus the amount, beside the misprinted balance', async () => {
    const result = convertStatement(await pagesFromFile(join(fixtures, 'au-with-misprint.pdf')));
    const flagged = result.transactions.filter((t) => t.status === 'mismatch');
    expect(flagged).toHaveLength(1);
    const row = flagged[0];
    if (!row?.arithmetic) throw new Error('the flagged row carries no arithmetic');
    // 2,759.83 before the row, plus the 3,284.50 credit, should give 6,044.33; the statement printed 6,054.33.
    expect(row.arithmetic).toEqual({ previousCents: 275983, effectCents: 328450, expectedCents: 604433 });
    expect(row.balanceCents).toBe(605433);
    expect(displayArithmetic(row.arithmetic)).toBe('2,759.83 + 3,284.50 = 6,044.33');
    // Rows that agree with the printed balance carry no sum.
    expect(result.transactions.filter((t) => t.arithmetic !== undefined)).toHaveLength(1);
  });

  it('shows money out with a minus, as the worked example does', () => {
    expect(displayArithmetic({ previousCents: 336760, effectCents: -19600, expectedCents: 317160 })).toBe('3,367.60 - 196.00 = 3,171.60');
  });

  it('starts from the opening balance on the first row', () => {
    const items = [
      { text: 'Date', x: 40, y: 100, width: 20, height: 9 },
      { text: 'Description', x: 100, y: 100, width: 50, height: 9 },
      { text: 'Amount', x: 330, y: 100, width: 30, height: 9 },
      { text: 'Balance', x: 430, y: 100, width: 30, height: 9 },
      { text: 'Opening balance', x: 100, y: 114, width: 70, height: 9 },
      { text: '1,000.00', x: 424, y: 114, width: 36, height: 9 },
      { text: '03/12/2025', x: 40, y: 128, width: 46, height: 9 },
      { text: 'Grocery store', x: 100, y: 128, width: 60, height: 9 },
      { text: '-82.40', x: 334, y: 128, width: 26, height: 9 },
      { text: '927.60', x: 432, y: 128, width: 28, height: 9 },
      { text: '04/12/2025', x: 40, y: 142, width: 46, height: 9 },
      { text: 'Salary', x: 100, y: 142, width: 30, height: 9 },
      { text: '2,450.00', x: 324, y: 142, width: 36, height: 9 },
      { text: '3,367.60', x: 424, y: 142, width: 36, height: 9 },
    ];
    const result = convertStatement([{ pageNumber: 1, width: 612, height: 792, items }]);
    const first = result.transactions[0];
    expect(first?.status).toBe('mismatch');
    expect(first?.arithmetic).toEqual({ previousCents: 100000, effectCents: -8240, expectedCents: 91760 });
  });
});
