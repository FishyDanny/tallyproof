/**
 * Patterns for prices and buy-style calls to action. While PRICES_VISIBLE is
 * false, none of these may appear anywhere on the built site (pages, structured
 * data, meta tags, scripts). The same patterns are used by the unit tests, by the
 * built-page scan, and against the live site.
 */

export interface PricePattern {
  name: string;
  pattern: RegExp;
}

/** Prices written as US$..., or as the three plan prices in dollars. */
const PRICE_PATTERNS: readonly PricePattern[] = [
  { name: 'US$ amount', pattern: /\bUS\$/ },
  // $9, $19 and $69 as whole prices. Amounts such as $1,093.90, $19.40 or $90 are not prices.
  { name: 'plan price in dollars', pattern: /\$\s?(?:9|19|69)(?:\.00)?(?!\d|[.,]\d)/ },
  { name: 'per month or per year', pattern: /\bper (?:month|year|annum)\b/i },
];

/** Calls to action and plan names that sell something nobody can buy yet. */
const SALES_PATTERNS: readonly PricePattern[] = [
  { name: 'Catch-up Pass', pattern: /catch-up pass/i },
  { name: 'buy, upgrade or subscribe', pattern: /\b(?:buy the|buy now|upgrade to|subscribe)\b/i },
  { name: 'Pro plan or subscription', pattern: /\bPro (?:plan|subscription)\b/i },
  { name: 'available with Pro', pattern: /\bavailable with Pro\b|\(Pro\)/i },
];

export const ALL_PATTERNS: readonly PricePattern[] = [...PRICE_PATTERNS, ...SALES_PATTERNS];

/** Patterns that are safe to run over minified JavaScript, where "$9" is ordinary code. */
export const SCRIPT_PATTERNS: readonly PricePattern[] = ALL_PATTERNS.filter((p) => p.name !== 'plan price in dollars');

export interface PriceHit {
  name: string;
  /** The matching text with a little context around it. */
  context: string;
}

/** Every price or sales phrase found in the text. An empty list means the text is clean. */
export function findPrices(text: string, patterns: readonly PricePattern[] = ALL_PATTERNS): PriceHit[] {
  const hits: PriceHit[] = [];
  for (const { name, pattern } of patterns) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const match of text.matchAll(global)) {
      const start = Math.max(0, (match.index ?? 0) - 40);
      const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 40);
      hits.push({ name, context: text.slice(start, end).replace(/\s+/g, ' ') });
    }
  }
  return hits;
}
