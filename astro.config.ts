import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { remarkPlaceholders } from './src/lib/remark-placeholders.ts';
import { remarkPriceBlocks } from './src/lib/remark-price-blocks.ts';
import { PRICES_VISIBLE } from './src/pricing.ts';

const env = loadEnv(process.env['NODE_ENV'] ?? 'production', process.cwd(), 'PUBLIC_');

// Prices must never be shown while nobody can pay, so refuse to build that site.
if (PRICES_VISIBLE) {
  const missing = ['PUBLIC_CHECKOUT_MONTHLY', 'PUBLIC_CHECKOUT_YEARLY', 'PUBLIC_CHECKOUT_PASS'].filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`PRICES_VISIBLE is true, but there are no checkout links for: ${missing.join(', ')}. Run "pnpm polar:setup" first.`);
  }
}

export default defineConfig({
  // The public address of the site. Set PUBLIC_SITE_URL if the pages.dev name differs or a domain is added.
  site: env['PUBLIC_SITE_URL'] || 'https://tallyproof.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    preact(),
    // The purchase confirmation page only means something once there is something to buy.
    sitemap({ filter: (page) => PRICES_VISIBLE || !page.endsWith('/thanks/') }),
  ],
  security: {
    // The browser itself blocks any request except to this site and to Polar's
    // licence check, so a statement cannot be sent anywhere even by mistake.
    csp: {
      directives: [
        "default-src 'self'",
        "connect-src 'self' https://api.polar.sh https://sandbox-api.polar.sh",
        "img-src 'self' data:",
        "font-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  markdown: {
    remarkPlugins: [
      remarkPlaceholders({
        supportEmail: env['PUBLIC_SUPPORT_EMAIL'] ?? '',
        repoUrl: env['PUBLIC_REPO_URL'] ?? '',
      }),
      remarkPriceBlocks(PRICES_VISIBLE),
    ],
  },
});
