/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Polar organisation id used to validate Pro licence keys. */
  readonly PUBLIC_POLAR_ORG_ID?: string;
  /** "true" to use Polar's sandbox API while testing purchases. */
  readonly PUBLIC_POLAR_SANDBOX?: string;
  /** Polar checkout links for each plan. */
  readonly PUBLIC_CHECKOUT_MONTHLY?: string;
  readonly PUBLIC_CHECKOUT_YEARLY?: string;
  readonly PUBLIC_CHECKOUT_PASS?: string;
  /** Public support address shown on the site. */
  readonly PUBLIC_SUPPORT_EMAIL?: string;
  /** Public source repository URL. */
  readonly PUBLIC_REPO_URL?: string;
  /** Public address of the site. */
  readonly PUBLIC_SITE_URL?: string;
  /** Google Search Console verification token (meta tag method). */
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
