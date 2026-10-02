import { describe, expect, it } from 'vitest';
import { mergeStatements } from '../../src/engine/merge.ts';
import type { Transaction } from '../../src/engine/types.ts';

const tx = (date: string, description: string, amountCents: number, balanceCents: number | null = null): Transaction => ({
  date,
  description,
  amountCents,
  balanceCents,
  page: 1,
  status: 'verified',
  source: '',
});

describe('mergeStatements', () => {
  it('orders rows by date across files', () => {
    const { transactions } = mergeStatements([[tx('2026-02-01', 'B', -1)], [tx('2026-01-01', 'A', -1)]]);
    expect(transactions.map((t) => t.description)).toEqual(['A', 'B']);
  });

  it('drops rows repeated in an overlapping statement', () => {
    const jan = [tx('2026-01-30', 'Rent', -100000, 5000), tx('2026-01-31', 'Coffee', -450, 4550)];
    const overlap = [tx('2026-01-31', 'Coffee', -450, 4550), tx('2026-02-01', 'Pay', 300000, 304550)];
    const { transactions, duplicatesRemoved } = mergeStatements([jan, overlap]);
    expect(duplicatesRemoved).toBe(1);
    expect(transactions).toHaveLength(3);
  });

  it('keeps genuine same-day repeats within one statement', () => {
    const day = [tx('2026-01-05', 'Coffee', -450), tx('2026-01-05', 'Coffee', -450)];
    expect(mergeStatements([day]).transactions).toHaveLength(2);
  });

  it('keeps an extra repeat that only the later file has', () => {
    const a = [tx('2026-01-05', 'Coffee', -450)];
    const b = [tx('2026-01-05', 'Coffee', -450), tx('2026-01-05', 'Coffee', -450)];
    const { transactions, duplicatesRemoved } = mergeStatements([a, b]);
    expect(duplicatesRemoved).toBe(1);
    expect(transactions).toHaveLength(2);
  });
});
