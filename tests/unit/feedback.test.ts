import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_ORIGIN, FEEDBACK_SITE, feedbackHref } from '../../src/feedback.ts';

const root = new URL('../../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

/** Every file under a folder of the source tree, as a path from the repository root. */
function filesUnder(folder: string): string[] {
  return readdirSync(new URL(folder, root), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(`${folder}${entry.name}/`) : [join(folder, entry.name).replaceAll('\\', '/')],
  );
}

describe('feedbackHref', () => {
  it('names this site, and the page when there is one, on the hub the form lives on', () => {
    expect(FEEDBACK_ORIGIN).toBe('https://hub.campsitestudios.net');
    expect(FEEDBACK_SITE).toBe('tallyproof');
    expect(feedbackHref('/guides/')).toBe('https://hub.campsitestudios.net/feedback?site=tallyproof&page=%2Fguides%2F');
    expect(feedbackHref(null)).toBe('https://hub.campsitestudios.net/feedback?site=tallyproof');
  });
});

describe('the converter keeps its promise of no network request', () => {
  it('has a Feedback link in the footer, as a link and nothing else', () => {
    const layout = read('src/layouts/Base.astro');
    const footer = layout.slice(layout.indexOf('<footer'), layout.indexOf('</footer>'));
    expect(footer).toContain('<a href={feedbackHref(Astro.url.pathname)} rel="noreferrer">Feedback</a>');
    expect(layout.slice(0, layout.indexOf('<footer'))).not.toMatch(/feedbackHref\(/);
    expect(layout).not.toMatch(/<form|<iframe|<img|\sping=/);
    expect(layout).not.toContain('hub.campsitestudios.net');
    for (const hint of layout.match(/<link rel="(?:prefetch|preconnect|dns-prefetch|preload)"[^>]*>/g) ?? []) {
      expect(hint, "a resource hint may only name the site's own font").toContain('href={fontUrl}');
    }
  });

  it('is not mentioned by anything that runs in the converter: its components, engine and libraries, or its page', () => {
    for (const file of [...filesUnder('src/components/'), ...filesUnder('src/engine/'), ...filesUnder('src/lib/'), 'src/pages/index.astro']) {
      const source = read(file);
      expect(source, file).not.toContain('hub.campsitestudios.net');
      expect(source, file).not.toMatch(/feedbackHref|FEEDBACK_ORIGIN/);
    }
  });

  it('leaves the security policy as it was: it still allows connections only to this site and the licence check', () => {
    const config = read('astro.config.ts');
    expect(config).toContain(`"connect-src 'self' https://api.polar.sh https://sandbox-api.polar.sh"`);
    expect(config).toContain(`"form-action 'self'"`);
    expect(config).not.toContain('hub.campsitestudios.net');
  });
});

describe('the privacy policy', () => {
  const policy = read('src/content/legal/privacy.md');
  const count = (text: string): number => policy.split(text).length - 1;

  it('has a feedback section that says what is kept, where, for how long, who reads it, how to have it deleted, and that the converter never contacts it', () => {
    expect(policy).toContain('### Feedback (optional)');
    expect(policy).toContain('so the converter never contacts it: nothing is loaded or sent unless you choose to follow the link, and nothing from a statement is ever sent with it.');
    expect(policy).toContain('We keep your email address only if you tick the box that lets us reply.');
    expect(policy).toContain('for up to two days, and then remove it');
    expect(policy).toContain('stored in a Cloudflare D1 database that only we can read');
    expect(policy).toContain('The form sets no cookies and loads no scripts.');
    expect(policy).toContain('We delete a message 12 months after you send it, or sooner if you ask at SUPPORT_EMAIL.');
  });

  it('uses the SUPPORT_EMAIL placeholder and never writes an address', () => {
    expect(policy).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('says feedback is not analytics: Tallyproof is off the zone the hub counts, so the no-analytics lines stay as they were', () => {
    expect(policy).toContain('We do not use analytics or advertising tools.');
    expect(policy).not.toContain('referring website and country');
  });

  it('carries the new effective date in both price variants, and the new lines in both lists of purposes and both lists of legal bases', () => {
    expect(count('**Effective date: 8 October 2026**')).toBe(2);
    expect(policy).not.toContain('**Effective date: 2 October 2026**');
    expect(policy).not.toContain('**Effective date: 4 October 2026**');
    expect(count('- read and reply to feedback you choose to send, and keep the feedback form free of spam;')).toBe(2);
    expect(count('- legitimate interests, for reading the feedback you send and keeping the feedback form free of spam, and your consent, for keeping the email address you give so that we can reply;')).toBe(2);
    expect(count('- Feedback: deleted 12 months after you send it.')).toBe(1);
    expect(policy).toContain('(support emails, feedback and any order information received from Polar)');
  });
});
