/**
 * Run the converter over every PDF in a folder and print a short report.
 * Used to try real statements kept outside the repository, e.g.
 *   node --experimental-strip-types scripts/try-statements.ts private-fixtures
 * Pass --rows to print every transaction, --lines to dump grouped text lines.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { convertStatement } from '../src/engine/convert.ts';
import { extractPages } from '../src/engine/extract.ts';
import type { PdfJsLike } from '../src/engine/extract.ts';
import { groupLines } from '../src/engine/lines.ts';
import { formatCents } from '../src/engine/money.ts';

const dir = process.argv[2] ?? 'private-fixtures';
const showRows = process.argv.includes('--rows');
const showLines = process.argv.includes('--lines');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

for (const name of readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'))) {
  if (only && !name.includes(only)) continue;
  const pages = await extractPages(pdfjs as unknown as PdfJsLike, new Uint8Array(readFileSync(join(dir, name))));
  const r = convertStatement(pages);
  const s = r.summary;
  console.log(`\n=== ${name}: ${pages.length} page(s), ${s.transactions} txns, ${s.verified} verified, ${s.mismatched} mismatch, ${s.unchecked} unchecked`);
  console.log(
    `    opening=${r.balance.openingCents === null ? '-' : formatCents(r.balance.openingCents)} closing=${r.balance.closingCents === null ? '-' : formatCents(r.balance.closingCents)} totalsMatch=${String(r.balance.totalsMatch)} order=${r.dateOrder} liability=${String(r.liabilityBalance)}`,
  );
  console.log(`    columns: ${r.columns.map((c) => `${c.role}@${Math.round(c.right)}(${c.source})`).join(', ')}`);
  for (const w of r.warnings) console.log(`    ! ${w}`);
  if (showRows) {
    for (const t of r.transactions) {
      console.log(`    ${t.date} ${formatCents(t.amountCents).padStart(11)} ${(t.balanceCents === null ? '' : formatCents(t.balanceCents)).padStart(11)} ${t.status.padEnd(14)} ${t.description.slice(0, 70)}`);
    }
  }
  if (showLines) {
    for (const l of groupLines(pages)) {
      console.log(`    p${l.page} y=${l.y.toFixed(1)} | ${l.cells.map((c) => `[${Math.round(c.x0)}-${Math.round(c.x1)}] ${c.text}`).join(' | ')}`);
    }
  }
}
