import type { Transaction } from './types.ts';

export interface MergeResult {
  transactions: Transaction[];
  /** Rows dropped because an earlier statement already contained them. */
  duplicatesRemoved: number;
}

function key(t: Transaction): string {
  return `${t.date}|${t.amountCents}|${t.balanceCents ?? ''}|${t.description.toLowerCase()}`;
}

/**
 * Merge several converted statements into one date-ordered list. When two
 * statements overlap (for example a monthly statement and a quarterly one),
 * rows that appear in an earlier file are dropped from later files. Repeats
 * within a single file are kept, because two identical purchases on the same
 * day are real transactions.
 */
export function mergeStatements(statements: Transaction[][]): MergeResult {
  const seen = new Map<string, number>();
  const merged: Array<{ t: Transaction; file: number; index: number }> = [];
  let duplicatesRemoved = 0;

  statements.forEach((rows, file) => {
    const countsInFile = new Map<string, number>();
    rows.forEach((t, index) => {
      const k = key(t);
      const nth = (countsInFile.get(k) ?? 0) + 1;
      countsInFile.set(k, nth);
      // Drop the nth copy only if earlier files already had at least n copies.
      if ((seen.get(k) ?? 0) >= nth) {
        duplicatesRemoved += 1;
        return;
      }
      merged.push({ t, file, index });
    });
    for (const [k, n] of countsInFile) seen.set(k, Math.max(seen.get(k) ?? 0, n));
  });

  merged.sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.file - b.file || a.index - b.index));
  return { transactions: merged.map((m) => m.t), duplicatesRemoved };
}
