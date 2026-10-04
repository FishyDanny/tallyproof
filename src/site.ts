/** Site-wide settings. Values that depend on the owner's accounts come from PUBLIC_* environment variables. */
export const SITE = {
  name: 'Tallyproof',
  tagline: 'PDF bank statements to CSV, checked row by row, without uploading anything.',
  supportEmail: import.meta.env.PUBLIC_SUPPORT_EMAIL ?? '',
  repoUrl: import.meta.env.PUBLIC_REPO_URL ?? '',
  checkout: {
    monthly: import.meta.env.PUBLIC_CHECKOUT_MONTHLY ?? '',
    yearly: import.meta.env.PUBLIC_CHECKOUT_YEARLY ?? '',
    pass: import.meta.env.PUBLIC_CHECKOUT_PASS ?? '',
  },
} as const;

export { EARLY_ACCESS, PRICES, PRICES_VISIBLE } from './pricing.ts';
