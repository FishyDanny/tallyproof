/**
 * The single switch for everything price-related on the site.
 *
 * While this is false the site shows no prices and no buy, upgrade or subscribe
 * calls to action. Paid features are described as "not available yet", because
 * checkout (Polar) is not wired up and nobody could pay. Keep it false until a
 * test purchase works end to end.
 *
 * To bring prices back once Polar is live:
 *   1. set PRICES_VISIBLE to true;
 *   2. delete .astro and node_modules/.astro (the content cache does not notice
 *      a flag change, so stale Markdown output would otherwise survive);
 *   3. rebuild and redeploy.
 *
 * This file must stay free of import.meta.env so astro.config.ts can import it.
 */
export const PRICES_VISIBLE = false;

/** The prices shown when PRICES_VISIBLE is true. */
export const PRICES = {
  monthly: 'US$9 / month',
  yearly: 'US$69 / year',
  pass: 'US$19 once',
} as const;

/** Wording used wherever prices are hidden. */
export const EARLY_ACCESS = {
  headline: 'Free while in early access.',
  promise: "Paid plans will come later. We'll announce the price before anything is charged.",
  notAvailable: 'not available yet',
} as const;

/** Pick between the priced wording and the early-access wording. */
export function byPriceVisibility<T>(priced: T, earlyAccess: T, visible: boolean = PRICES_VISIBLE): T {
  return visible ? priced : earlyAccess;
}
