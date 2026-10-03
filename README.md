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

Copy `.env.example` to `.env` and fill in the Polar organisation id, checkout links and support email (leave `PUBLIC_REPO_URL` empty while the repository is private: when it is set, the header and footer show a "Source code" link). All values are public (`PUBLIC_*`); no secrets are needed by the site.

## Privacy, and how to check it

The repository is private. The privacy claim does not depend on reading the source:

- A counter under the converter (`src/components/PrivacyMeter.tsx`) shows how many network requests the page has made since the file was chosen, from the browser's own Resource Timing entries. It should read zero.
- The Content-Security-Policy (`astro.config.ts`, emitted as a meta tag) only allows connections to the site itself and Polar's licence API, so the browser refuses to send anything elsewhere.
- Anyone can confirm both in the browser's developer tools: the Network tab while converting, and the policy in the page source.

## Licence

`LICENSE` (AGPL-3.0) and the `license` field in `package.json` date from when this code was public (2-3 October 2026). The licence for the code from now on is an open decision for the owner; until it is made, those files are unchanged.
