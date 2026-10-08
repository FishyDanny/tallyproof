/**
 * The address of the Feedback form. The form is a page on a separate website, the Campsite Studios hub (hub.campsitestudios.net), so
 * Tallyproof has no form, loads no script and makes no request for it: the footer holds an ordinary link, which does nothing until a
 * visitor follows it, and the converter never refers to it. That keeps the promise that converting a statement makes no network request.
 * Nothing about a statement is sent: the address names only this site and the page.
 */
export const FEEDBACK_ORIGIN = 'https://hub.campsitestudios.net';

/** The id this site has in the hub's list of sites (shared/sites.ts in the hub repo). */
export const FEEDBACK_SITE = 'tallyproof';

/** The address of the form for a page, or for no page when `pathname` is null. */
export function feedbackHref(pathname: string | null): string {
  const query = new URLSearchParams({ site: FEEDBACK_SITE });
  if (pathname) query.set('page', pathname);
  return `${FEEDBACK_ORIGIN}/feedback?${query.toString()}`;
}
