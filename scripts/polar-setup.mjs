// Create Tallyproof's products, licence-key benefits and checkout links in Polar,
// then write the checkout links into .env as PUBLIC_CHECKOUT_* values.
//
//   node scripts/polar-setup.mjs --dry-run      show what would be created
//   node scripts/polar-setup.mjs                create (or reuse) everything
//
// Needs POLAR_ACCESS_TOKEN (an organisation access token) in .env. Set
// PUBLIC_POLAR_SANDBOX=true to work against sandbox-api.polar.sh while testing.
// Safe to re-run: anything already created (matched by metadata) is reused.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const ENV_PATH = '.env';

function readEnv() {
  if (!existsSync(ENV_PATH)) return {};
  const env = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function writeEnvValues(values) {
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8').split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_PATH, `${lines.filter((l, i, a) => l !== '' || i < a.length - 1).join('\n')}\n`);
}

const env = readEnv();
const sandbox = env.PUBLIC_POLAR_SANDBOX === 'true';
const API = sandbox ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
const SITE = env.PUBLIC_SITE_URL || 'https://tallyproof.pages.dev';
const token = env.POLAR_ACCESS_TOKEN;

const BENEFITS = [
  { key: 'pro-licence', description: 'Tallyproof Pro licence key', properties: { prefix: 'TALLY' } },
  {
    key: 'pass-licence',
    description: 'Tallyproof 30-day licence key',
    properties: { prefix: 'TALLYPASS', expires: { ttl: 30, timeframe: 'day' } },
  },
];

const PRODUCTS = [
  { key: 'pro-monthly', name: 'Tallyproof Pro (monthly)', interval: 'month', cents: 900, benefit: 'pro-licence', env: 'PUBLIC_CHECKOUT_MONTHLY' },
  { key: 'pro-yearly', name: 'Tallyproof Pro (yearly)', interval: 'year', cents: 6900, benefit: 'pro-licence', env: 'PUBLIC_CHECKOUT_YEARLY' },
  { key: 'catch-up-pass', name: 'Tallyproof Catch-up Pass (30 days)', interval: null, cents: 1900, benefit: 'pass-licence', env: 'PUBLIC_CHECKOUT_PASS' },
];

const DESCRIPTION =
  'Converts many PDF bank statements at once in your browser, merges them into one file with overlapping rows removed, and exports OFX and QIF. Your statements are never uploaded.';

async function api(method, path, body) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${method} ${API}${path}${body ? ` ${JSON.stringify(body)}` : ''}`);
    return { id: `dry-${path.replace(/\W+/g, '-')}`, items: [], url: `${SITE}/pricing/#dry-run` };
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} failed: HTTP ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function listAll(path) {
  if (DRY_RUN) return [];
  const items = [];
  for (let page = 1; page < 20; page += 1) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await api('GET', `${path}${sep}limit=100&page=${page}`);
    items.push(...(res.items ?? []));
    if (!res.pagination || page >= res.pagination.max_page) break;
  }
  return items;
}

if (!token && !DRY_RUN) {
  console.error('POLAR_ACCESS_TOKEN is missing from .env. See BLOCKERS.md item 3.');
  process.exit(1);
}

console.log(`Polar API: ${API}${DRY_RUN ? ' (dry run, nothing is sent)' : ''}`);

const existingBenefits = await listAll('/v1/benefits/?type=license_keys');
const benefitIds = {};
for (const b of BENEFITS) {
  const found = existingBenefits.find((e) => e.description === b.description);
  if (found) {
    benefitIds[b.key] = found.id;
    console.log(`Benefit exists: ${b.description}`);
    continue;
  }
  const created = await api('POST', '/v1/benefits/', { type: 'license_keys', description: b.description, properties: b.properties });
  benefitIds[b.key] = created.id;
  console.log(`Benefit created: ${b.description}`);
}

const existingProducts = await listAll('/v1/products/?is_archived=false');
const checkoutValues = {};
for (const p of PRODUCTS) {
  let product = existingProducts.find((e) => e.metadata?.tallyproof === p.key);
  if (product) {
    console.log(`Product exists: ${p.name}`);
  } else {
    product = await api('POST', '/v1/products/', {
      name: p.name,
      description: DESCRIPTION,
      recurring_interval: p.interval,
      prices: [{ amount_type: 'fixed', price_amount: p.cents, price_currency: 'usd' }],
      metadata: { tallyproof: p.key },
    });
    console.log(`Product created: ${p.name}`);
  }
  await api('POST', `/v1/products/${product.id}/benefits`, { benefits: [benefitIds[p.benefit]] });
  const link = await api('POST', '/v1/checkout-links/', {
    payment_processor: 'stripe',
    products: [product.id],
    success_url: `${SITE}/thanks/`,
    allow_discount_codes: true,
  });
  checkoutValues[p.env] = link.url;
  console.log(`Checkout link for ${p.name}: ${link.url}`);
}

if (DRY_RUN) {
  console.log('Dry run complete; .env was not changed.');
} else {
  writeEnvValues(checkoutValues);
  console.log(
    'Checkout links written to .env. The site still shows no prices. After a test purchase works, set PRICES_VISIBLE to true in ' +
      'src/pricing.ts, delete .astro and node_modules/.astro, then rebuild and redeploy to show the prices and Buy buttons.',
  );
}
