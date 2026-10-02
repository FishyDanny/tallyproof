/**
 * Write every export format for one fixture into a folder, so the files can be
 * checked with independent tools (for example Python's ofxtools).
 *   node --experimental-strip-types scripts/dump-exports.ts tests/fixtures/au-debit-credit-balance.pdf out-dir
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { convertStatement } from '../src/engine/convert.ts';
import { exportTransactions } from '../src/engine/export.ts';
import type { ExportFormat } from '../src/engine/export.ts';
import { extractPages } from '../src/engine/extract.ts';
import type { PdfJsLike } from '../src/engine/extract.ts';

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) throw new Error('usage: dump-exports.ts <statement.pdf> <out-dir>');
mkdirSync(outDir, { recursive: true });
const pages = await extractPages(pdfjs as unknown as PdfJsLike, new Uint8Array(readFileSync(input)));
const result = convertStatement(pages);
const formats: ExportFormat[] = ['csv', 'xero', 'quickbooks', 'ofx', 'qif'];
for (const format of formats) {
  const file = exportTransactions(
    result.transactions,
    format,
    { dateFormat: 'dd/mm/yyyy', currency: 'AUD', creditCard: result.liabilityBalance, closingCents: result.balance.closingCents },
    basename(input),
  );
  writeFileSync(join(outDir, file.filename), file.content);
}
const total = result.transactions.reduce((s, t) => s + t.amountCents, 0);
console.log(JSON.stringify({ rows: result.transactions.length, totalCents: total, creditCard: result.liabilityBalance }));
