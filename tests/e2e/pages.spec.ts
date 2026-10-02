import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/pricing/',
  '/faq/',
  '/privacy/',
  '/terms/',
  '/guides/',
  '/guides/import-bank-statements-into-xero/',
  '/guides/import-bank-statements-into-quickbooks-online/',
  '/guides/import-bank-statements-into-myob/',
  '/guides/convert-bank-statement-pdf-to-csv/',
  '/thanks/',
  '/convert/bank-statement-to-xero/',
  '/convert/bank-statement-to-quickbooks/',
  '/convert/bank-statement-to-myob/',
  '/convert/bank-statement-to-excel/',
  '/guides/convert-credit-card-statement-to-csv/',
  '/guides/bank-statement-pdf-to-excel/',
  '/guides/csv-vs-ofx-vs-qif-bank-statement-formats/',
  '/guides/catch-up-bookkeeping-old-bank-statements/',
  '/guides/check-converted-bank-statement-is-accurate/',
  '/guides/import-historical-transactions-bank-feed-limit/',
];

test('a content security policy limits connections to this site and the licence check', async ({ page }) => {
  await page.goto('/');
  const csp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self' https://api.polar.sh https://sandbox-api.polar.sh");
  expect(csp).toContain("default-src 'self'");
  // The browser enforces it: a request to another site is refused.
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});

for (const path of pages) {
  test(`${path} renders cleanly`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const html = await page.content();
    expect(html).not.toMatch(/SUPPORT_EMAIL|GITHUB_REPO_URL|undefined|\[object Object\]/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(50);

    // No horizontal scrolling at any viewport.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('only this site is contacted when pages load', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (r) => origins.add(new URL(r.url()).origin));
  for (const path of pages) await page.goto(path, { waitUntil: 'networkidle' });
  expect([...origins]).toEqual([new URL(baseURL ?? '').origin]);
});
