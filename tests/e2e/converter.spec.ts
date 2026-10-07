import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page, Request } from '@playwright/test';
import { PRICES_VISIBLE } from '../../src/pricing.ts';
import { findPrices } from '../helpers/price-patterns.ts';

const fixtures = join(import.meta.dirname, '..', 'fixtures');

interface ExpectedFixture {
  transactions: Array<{ date: string; amountCents: number }>;
}

function expected(name: string): ExpectedFixture {
  return JSON.parse(readFileSync(join(fixtures, `${name}.expected.json`), 'utf8')) as ExpectedFixture;
}

/** Wait until pdf.js has been preloaded, so that choosing a file needs no further downloads. */
async function openConverter(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('file-input')).toBeAttached();
  await page.waitForLoadState('networkidle');
}

async function convert(page: Page, name: string): Promise<Request[]> {
  const requests: Request[] = [];
  page.on('request', (r) => requests.push(r));
  await page.getByTestId('file-input').setInputFiles(join(fixtures, `${name}.pdf`));
  await expect(page.locator('[data-testid="results"], .converter .error, .converter .notice').first()).toBeVisible();
  return requests;
}

test('converts a statement locally with zero network requests', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await openConverter(page);
  const requests = await convert(page, 'au-debit-credit-balance');

  const want = expected('au-debit-credit-balance').transactions.length;
  await expect(page.getByTestId('summary')).toContainText(`${want} transactions`);
  await expect(page.getByTestId('verified-count')).toHaveText(`${want} checked against the printed balance`);
  await expect(page.getByTestId('transactions').locator('tbody tr')).toHaveCount(want);
  await expect(page.getByTestId('privacy-meter')).toContainText('Network requests since you chose your file: 0');

  // The browser itself confirms it: nothing was requested after the file was chosen.
  expect(requests.map((r) => `${r.method()} ${r.url()}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('flags the row whose printed balance is wrong', async ({ page }) => {
  await openConverter(page);
  await convert(page, 'au-with-misprint');
  await expect(page.getByTestId('summary')).toContainText('1 need checking');
  await expect(page.locator('tr.row-mismatch')).toHaveCount(1);
});

test('shows the sum beside a flagged row, without hovering', async ({ page }) => {
  await openConverter(page);
  await convert(page, 'au-with-misprint');
  const flagged = page.locator('tr.row-mismatch');
  await expect(flagged).toHaveCount(1);
  // Previous balance plus the amount gives the expected balance; the statement printed 6,054.33.
  await expect(flagged.getByTestId('row-arithmetic')).toHaveText('2,759.83 + 3,284.50 = 6,044.33');
  await expect(flagged.getByTestId('row-arithmetic')).toBeVisible();
  await expect(flagged.locator('td.status')).toContainText('Check this row');
  await expect(flagged.locator('td.status')).toContainText('As printed:');
  await expect(flagged).not.toHaveAttribute('title');
  await expect(page.getByTestId('row-arithmetic')).toHaveCount(1);
});

test('downloads a Xero CSV that matches the statement', async ({ page }) => {
  await openConverter(page);
  await convert(page, 'au-debit-credit-balance');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Xero CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('au-debit-credit-balance-xero.csv');
  const path = await download.path();
  const lines = readFileSync(path, 'utf8').trimEnd().split('\r\n');
  expect(lines[0]).toBe('Date,Amount,Payee,Description,Reference,Check Number');
  const want = expected('au-debit-credit-balance').transactions;
  expect(lines).toHaveLength(want.length + 1);
  const first = want[0];
  if (!first) throw new Error('fixture has no rows');
  const [y, m, d] = first.date.split('-');
  expect(lines[1]?.startsWith(`${d}/${m}/${y},${(first.amountCents / 100).toFixed(2)},`)).toBe(true);
});

test('generic CSV download starts with a byte order mark for Excel', async ({ page }) => {
  await openConverter(page);
  await convert(page, 'us-signed-amount');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download CSV/ }).click();
  const content = readFileSync(await (await downloadPromise).path());
  expect([...content.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
});

test('explains that scanned statements are not supported', async ({ page }) => {
  await openConverter(page);
  await convert(page, 'image-only');
  await expect(page.getByTestId('summary')).toContainText('no text layer');
});

test('free version converts one file at a time and keeps OFX and QIF locked', async ({ page }) => {
  await openConverter(page);
  await page
    .getByTestId('file-input')
    .setInputFiles([join(fixtures, 'au-debit-credit-balance.pdf'), join(fixtures, 'uk-paid-out-in.pdf')]);
  await expect(page.locator('.notice')).toContainText('one statement at a time');
  await expect(page.getByRole('button', { name: /Download OFX/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Download QIF/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Download CSV/ })).toBeEnabled();
  // Only the first statement was converted.
  await expect(page.getByTestId('summary')).toContainText('au-debit-credit-balance.pdf');
  await expect(page.getByTestId('summary')).not.toContainText('uk-paid-out-in.pdf');

  if (PRICES_VISIBLE) {
    await expect(page.locator('.notice')).toContainText('Pro converts many at once');
    await expect(page.getByRole('button', { name: /Download OFX \(Pro\)/ })).toBeDisabled();
  } else {
    // The limit is the same, but nothing tells people to buy something that cannot be bought.
    await expect(page.locator('.notice')).toContainText('are not available yet');
    await expect(page.getByRole('button', { name: /Download OFX \(not available yet\)/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Download QIF \(not available yet\)/ })).toBeDisabled();
    const converter = await page.locator('.converter').innerText();
    expect(findPrices(converter)).toEqual([]);
    expect(await page.getByTestId('exports').innerText()).not.toMatch(/\bPro\b/);
  }
});

test('rejects files that are not PDFs', async ({ page }) => {
  await openConverter(page);
  await page.getByTestId('file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.locator('.notice')).toContainText('Please choose a PDF');
});

test('reports a damaged PDF without crashing', async ({ page }) => {
  await openConverter(page);
  await page
    .getByTestId('file-input')
    .setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 not really a pdf') });
  await expect(page.locator('.error')).toContainText('could not be read');
});
