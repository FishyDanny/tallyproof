/**
 * Pro licence keys are sold through Polar and checked with Polar's public
 * validation endpoint. The request contains only the key and the organisation
 * id; statement data is never sent anywhere.
 */

export interface LicenceConfig {
  organisationId: string;
  apiBase: string;
}

export interface LicenceState {
  key: string;
  valid: boolean;
  /** ISO timestamp from Polar, or null for keys that do not expire. */
  expiresAt: string | null;
  checkedAt: string;
}

interface PolarValidateResponse {
  status?: string;
  expires_at?: string | null;
}

const STORAGE_KEY = 'tallyproof.licence';
/** Re-check a stored key at most this often. */
const RECHECK_MS = 24 * 60 * 60 * 1000;

export function licenceConfig(): LicenceConfig | null {
  const organisationId = import.meta.env.PUBLIC_POLAR_ORG_ID;
  if (typeof organisationId !== 'string' || organisationId.length === 0) return null;
  const sandbox = import.meta.env.PUBLIC_POLAR_SANDBOX === 'true';
  return { organisationId, apiBase: sandbox ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh' };
}

export function loadStoredLicence(): LicenceState | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LicenceState>;
    if (typeof parsed.key !== 'string' || typeof parsed.valid !== 'boolean' || typeof parsed.checkedAt !== 'string') return null;
    return { key: parsed.key, valid: parsed.valid, expiresAt: parsed.expiresAt ?? null, checkedAt: parsed.checkedAt };
  } catch {
    return null;
  }
}

function store(state: LicenceState | null): void {
  try {
    if (state) globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    else globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private windows, blocked site data); Pro then lasts for this visit only.
  }
}

export function isActive(state: LicenceState | null, now: Date = new Date()): boolean {
  if (!state?.valid) return false;
  return state.expiresAt === null || new Date(state.expiresAt).getTime() > now.getTime();
}

export function needsRecheck(state: LicenceState, now: Date = new Date()): boolean {
  return now.getTime() - new Date(state.checkedAt).getTime() > RECHECK_MS;
}

export async function validateLicence(key: string, config: LicenceConfig, fetcher: typeof fetch = fetch): Promise<LicenceState> {
  const trimmed = key.trim();
  const response = await fetcher(`${config.apiBase}/v1/customer-portal/license-keys/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: trimmed, organization_id: config.organisationId }),
  });
  const checkedAt = new Date().toISOString();
  if (response.status === 404 || response.status === 422) {
    const state = { key: trimmed, valid: false, expiresAt: null, checkedAt };
    store(null);
    return state;
  }
  if (!response.ok) throw new Error(`Licence check failed (HTTP ${response.status}). Try again in a minute.`);
  const body = (await response.json()) as PolarValidateResponse;
  const state: LicenceState = {
    key: trimmed,
    valid: body.status === 'granted',
    expiresAt: body.expires_at ?? null,
    checkedAt,
  };
  store(state.valid ? state : null);
  return state;
}

export function forgetLicence(): void {
  store(null);
}
