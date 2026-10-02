# Tallyproof

Convert PDF bank statements to CSV, Xero CSV, QuickBooks Online CSV, OFX or QIF **in the browser**. The file is never uploaded. Every transaction is checked against the running balance printed on the statement, and rows that do not add up are flagged.

## How it works

1. `pdf.js` extracts positioned text from the PDF, on the user's device (`src/engine/extract.ts`).
2. Text is grouped into lines and cells (`src/engine/lines.ts`).
3. Dates, money values, header words, opening/closing balances and page-break checkpoints are recognised; money columns are found by clustering right edges (`src/engine/convert.ts`).
4. Signs and column meanings are confirmed from the printed balances, and every row is verified: previous balance + amount = printed balance. Rows between two printed balances are verified as a group; statements without a running balance are verified by opening + transactions = closing (`src/engine/verify.ts`).
5. Exports are generated locally (`src/engine/export.ts`).

## Development

```bash
pnpm install
pnpm dev            # local site
pnpm fixtures       # regenerate synthetic test statements
pnpm verify         # typecheck, lint, unit tests, build, browser tests
```

Real statements used for testing go in `private-fixtures/`, which is gitignored and must never be committed.

## Configuration

Copy `.env.example` to `.env` and fill in the Polar organisation id, checkout links, support email and repository URL. All values are public (`PUBLIC_*`); no secrets are needed by the site.

## Licence

AGPL-3.0. See `LICENSE`.
