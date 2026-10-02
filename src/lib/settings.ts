import type { DateFormat } from '../engine/export.ts';

const DATE_FORMAT_KEY = 'tallyproof.dateFormat';
const FORMATS: readonly DateFormat[] = ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd'];

/** The export date format the user last chose on this device, if any. */
export function loadDateFormat(): DateFormat | null {
  try {
    const value = globalThis.localStorage?.getItem(DATE_FORMAT_KEY);
    return FORMATS.find((f) => f === value) ?? null;
  } catch {
    return null;
  }
}

export const CURRENCIES = ['AUD', 'NZD', 'GBP', 'USD', 'CAD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

const CURRENCY_KEY = 'tallyproof.currency';
const REGION_CURRENCY: Record<string, Currency> = { AU: 'AUD', NZ: 'NZD', GB: 'GBP', UK: 'GBP', US: 'USD', CA: 'CAD' };
const EURO_REGIONS = new Set(['IE', 'DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'AT', 'PT', 'FI', 'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR']);

/** Currency for OFX files: the last choice on this device, else a guess from the browser's region. */
export function loadCurrency(language: string = globalThis.navigator?.language ?? ''): Currency {
  try {
    const stored = globalThis.localStorage?.getItem(CURRENCY_KEY);
    const match = CURRENCIES.find((c) => c === stored);
    if (match) return match;
  } catch {
    // Fall through to the guess.
  }
  const region = language.split('-')[1]?.toUpperCase() ?? '';
  if (EURO_REGIONS.has(region)) return 'EUR';
  return REGION_CURRENCY[region] ?? 'AUD';
}

export function saveCurrency(currency: Currency): void {
  try {
    globalThis.localStorage?.setItem(CURRENCY_KEY, currency);
  } catch {
    // Storage can be unavailable; the choice then lasts for this visit only.
  }
}

export function saveDateFormat(format: DateFormat): void {
  try {
    globalThis.localStorage?.setItem(DATE_FORMAT_KEY, format);
  } catch {
    // Storage can be unavailable; the choice then lasts for this visit only.
  }
}
