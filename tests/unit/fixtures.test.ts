import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertStatement } from '../../src/engine/convert.ts';
import { pagesFromFile } from '../helpers/pdf-node.ts';

interface ExpectedTransaction {
  date: string;
  description: string;
  amountCents: number;
  balanceCents: number | null;
}

interface ExpectedFixture {
  name: string;
  description: string;
  dateOrder: 'dmy' | 'mdy' | 'ymd';
  liabilityBalance: boolean;
  openingCents: number | null;
  closingCents: number | null;
  transactions: ExpectedTransaction[];
  mismatchDates?: string[];
}

const dir = join(import.meta.dirname, '..', 'fixtures');
const fixtures = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.expected.json')) : [];

describe.skipIf(fixtures.length === 0)('synthetic statement fixtures', () => {
  for (const file of fixtures) {
    const expected = JSON.parse(readFileSync(join(dir, file), 'utf8')) as ExpectedFixture;
    const pdfPath = join(dir, file.replace('.expected.json', '.pdf'));

    it(`${expected.name}: ${expected.description}`, async () => {
      const result = convertStatement(await pagesFromFile(pdfPath));
      const got = result.transactions.map((t) => ({
        date: t.date,
        description: t.description,
        amountCents: t.amountCents,
        balanceCents: t.balanceCents,
      }));
      expect(got).toEqual(expected.transactions);
      if (expected.transactions.length === 0) {
        expect(result.warnings.length).toBeGreaterThan(0);
        return;
      }
      expect(result.liabilityBalance).toBe(expected.liabilityBalance);
      expect(result.balance.openingCents).toBe(expected.openingCents);
      expect(result.balance.closingCents).toBe(expected.closingCents);

      const mismatchDates = new Set(expected.mismatchDates ?? []);
      for (const t of result.transactions) {
        if (mismatchDates.has(t.date)) continue;
        expect.soft(t.status, `${t.date} ${t.description}`).toMatch(/^verified/);
      }
      if (mismatchDates.size > 0) {
        expect(result.transactions.some((t) => t.status === 'mismatch' && mismatchDates.has(t.date))).toBe(true);
      }
    });
  }
});
