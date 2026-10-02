import { describe, expect, it } from 'vitest';
import { isActive, needsRecheck, validateLicence } from '../../src/lib/licence.ts';
import type { LicenceConfig, LicenceState } from '../../src/lib/licence.ts';

const config: LicenceConfig = { organisationId: 'org-123', apiBase: 'https://sandbox-api.polar.sh' };

function fakeFetch(status: number, body: unknown, seen: Array<{ url: string; body: string }> = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(input), body: String(init?.body ?? '') });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

describe('validateLicence', () => {
  it('sends only the key and organisation id, and accepts a granted key', async () => {
    const seen: Array<{ url: string; body: string }> = [];
    const state = await validateLicence('  KEY-1  ', config, fakeFetch(200, { status: 'granted', expires_at: null }, seen));
    expect(state.valid).toBe(true);
    expect(seen[0]?.url).toBe('https://sandbox-api.polar.sh/v1/customer-portal/license-keys/validate');
    expect(JSON.parse(seen[0]?.body ?? '{}')).toEqual({ key: 'KEY-1', organization_id: 'org-123' });
  });

  it('rejects unknown, revoked or expired keys', async () => {
    const state = await validateLicence('nope', config, fakeFetch(404, { detail: 'not found' }));
    expect(state.valid).toBe(false);
  });

  it('reports server errors instead of treating them as invalid keys', async () => {
    await expect(validateLicence('KEY-1', config, fakeFetch(503, {}))).rejects.toThrow(/HTTP 503/);
  });
});

describe('licence state', () => {
  const base: LicenceState = { key: 'K', valid: true, expiresAt: null, checkedAt: '2026-10-01T00:00:00.000Z' };
  it('honours expiry dates', () => {
    const now = new Date('2026-10-02T00:00:00Z');
    expect(isActive(base, now)).toBe(true);
    expect(isActive({ ...base, expiresAt: '2026-10-01T12:00:00Z' }, now)).toBe(false);
    expect(isActive({ ...base, valid: false }, now)).toBe(false);
    expect(isActive(null, now)).toBe(false);
  });
  it('re-checks a stored key once a day', () => {
    expect(needsRecheck(base, new Date('2026-10-01T12:00:00Z'))).toBe(false);
    expect(needsRecheck(base, new Date('2026-10-02T01:00:00Z'))).toBe(true);
  });
});
