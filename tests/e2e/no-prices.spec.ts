import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { PRICES_VISIBLE } from '../../src/pricing.ts';
import { findPrices, SCRIPT_PATTERNS } from '../helpers/price-patterns.ts';
import type { PriceHit } from '../helpers/price-patterns.ts';

// While prices are hidden, no built page may show a price or a buy-style call to action.
// The scan reads the sitemap, so it covers every page that is published, and it works
// against a deployed site too (E2E_BASE_URL=https://tallyproof.pages.dev pnpm test:e2e).
test.skip(PRICES_VISIBLE, 'PRICES_VISIBLE is true, so prices are meant to be shown.');

/** Pages that are not in the sitemap but are still served. */
const EXTRA_PATHS = ['/thanks/', '/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml', '/this-page-does-not-exist/'];

async function fetchText(request: APIRequestContext, path: string): Promise<{ status: number; body: string }> {
  const response = await request.get(path);
  return { status: response.status(), body: await response.text() };
}

/** The paths listed in the sitemap, whatever origin the sitemap was built for. */
async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const index = await fetchText(request, '/sitemap-index.xml');
  expect(index.status).toBe(200);
  const paths: string[] = [];
  for (const sitemap of index.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const child = await fetchText(request, new URL(sitemap[1] ?? '').pathname);
    expect(child.status).toBe(200);
    for (const loc of child.body.matchAll(/<loc>([^<]+)<\/loc>/g)) paths.push(new URL(loc[1] ?? '').pathname);
  }
  return paths;
}

/** The JavaScript files a page loads, including the chunks those files import. */
async function scriptsFor(request: APIRequestContext, html: string, seen: Map<string, string>): Promise<void> {
  const queue = [...html.matchAll(/["'(](\/_astro\/[^"'()\s]+\.m?js)/g)].map((m) => m[1] ?? '');
  while (queue.length > 0) {
    const path = queue.pop();
    if (!path || seen.has(path)) continue;
    const { status, body } = await fetchText(request, path);
    expect(status, path).toBe(200);
    seen.set(path, body);
    for (const m of body.matchAll(/["'](\.{1,2}\/[^"']+\.m?js)["']/g)) {
      queue.push(new URL(m[1] ?? '', `http://x${path}`).pathname);
    }
  }
}

function describeHits(path: string, hits: PriceHit[]): string[] {
  return hits.map((h) => `${path}: ${h.name}: "${h.context}"`);
}

test('the sitemap lists the pages that matter', async ({ request }) => {
  const paths = await sitemapPaths(request);
  expect(paths.length).toBeGreaterThanOrEqual(20);
  for (const expected of ['/', '/pricing/', '/faq/', '/terms/', '/privacy/', '/convert/bank-statement-to-myob/']) {
    expect(paths, expected).toContain(expected);
  }
  // The purchase confirmation page is hidden from search while there is nothing to buy.
  expect(paths).not.toContain('/thanks/');
});

test('no page, sitemap, script or structured-data block shows a price or a buy call to action', async ({ request }) => {
  const paths = [...new Set([...(await sitemapPaths(request)), ...EXTRA_PATHS])];
  const problems: string[] = [];
  const scripts = new Map<string, string>();

  for (const path of paths) {
    const { status, body } = await fetchText(request, path);
    // The missing page is meant to be a 404; every other path must exist.
    expect(status, path).toBe(path === '/this-page-does-not-exist/' ? 404 : 200);
    problems.push(...describeHits(path, findPrices(body)));
    await scriptsFor(request, body, scripts);

    // Structured data may describe the free offer, and nothing else.
    for (const block of body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(block[1] ?? 'null') as { offers?: { price?: string } };
      if (data.offers) expect(data.offers.price, `${path} JSON-LD offer`).toBe('0');
    }
  }

  expect(scripts.size, 'the converter script was not found').toBeGreaterThan(0);
  for (const [path, code] of scripts) problems.push(...describeHits(path, findPrices(code, SCRIPT_PATTERNS)));

  expect(problems).toEqual([]);
});

test('the purchase confirmation page is not offered to search engines and says nothing can be bought', async ({ page }) => {
  await page.goto('/thanks/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('h1')).toHaveText('Nothing to buy yet');
});

test('the pricing page says what is free and that paid plans come later', async ({ page }) => {
  await page.goto('/pricing/');
  const text = await page.locator('main').innerText();
  expect(text).toContain('Free while in early access.');
  expect(text).toContain('Paid plans will come later.');
  expect(text).toContain("We'll announce the price before anything is charged.");
  await expect(page.getByRole('link', { name: /buy|subscribe|upgrade/i })).toHaveCount(0);
});
