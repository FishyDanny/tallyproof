import type { RowArithmetic } from './types.ts';

/** Explicit sign markers found on a printed money value. */
export type SignMarker = 'negative' | 'positive' | 'none';

export interface ParsedMoney {
  /** Absolute value in cents. */
  cents: number;
  /** Sign as printed: a minus, parentheses or DR mean negative; a plus or CR mean positive. */
  marker: SignMarker;
  /** True when the value carried a CR or DR suffix. */
  creditDebitSuffix: boolean;
}

/** Currency codes some statements print before a value, such as "AUD 1,234.56". Kept short so description words are never read as money. */
export const CURRENCY_CODE = '(?:AUD|USD|NZD|GBP|EUR|SGD|HKD|INR|CAD)';

const MONEY_PATTERN = new RegExp(
  `^=?\\s*(?<open>\\()?\\s*(?<pre>[-+−])?\\s*(?:${CURRENCY_CODE}\\s*)?(?<cur>[$£€])?\\s*(?<pre2>[-+−])?\\s*(?<num>\\d{1,3}(?:,\\d{3})+|\\d+)?\\.(?<dec>\\d{2})\\s*(?<post>[-+−])?\\s*(?<close>\\))?(?:\\s*(?<sfx>CR|DR))?$`,
  'i',
);

/**
 * Parse a printed money value such as "1,234.56", "$1,250.00", "($123.45)",
 * "-45.00", "45.00-", "1,234.56 CR" or "AUD 1,234.56". Returns null for anything
 * else, including percentages, plain integers and values without exactly two
 * decimal places.
 */
export function parseMoney(raw: string): ParsedMoney | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > 32) return null;
  const match = MONEY_PATTERN.exec(text);
  if (!match?.groups) return null;
  const g = match.groups;

  const hasOpen = g['open'] !== undefined;
  const hasClose = g['close'] !== undefined;
  if (hasOpen !== hasClose) return null;

  const num = g['num'] ?? '0';
  const dec = g['dec'];
  if (dec === undefined) return null;
  const whole = Number.parseInt(num.replace(/,/g, ''), 10);
  const cents = whole * 100 + Number.parseInt(dec, 10);
  if (!Number.isSafeInteger(cents)) return null;

  const signs = [g['pre'], g['pre2'], g['post']].filter((s): s is string => s !== undefined);
  const isMinus = (s: string): boolean => s === '-' || s === '−';
  const suffix = g['sfx']?.toUpperCase();

  let marker: SignMarker = 'none';
  if (hasOpen || signs.some(isMinus) || suffix === 'DR') marker = 'negative';
  else if (signs.includes('+') || suffix === 'CR') marker = 'positive';

  return { cents, marker, creditDebitSuffix: suffix !== undefined };
}

/** Apply a parsed value's printed sign, treating unsigned values as positive. */
export function signedCents(value: ParsedMoney): number {
  return value.marker === 'negative' ? -value.cents : value.cents;
}

/** Format cents as a plain decimal string, e.g. -123456 -> "-1234.56". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

/** Format cents for display with thousands separators, e.g. 123456 -> "1,234.56". */
export function displayCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString('en-AU');
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

/**
 * The sum behind a flagged row, in the form the worked example on the home page uses:
 * previous balance, then plus or minus the movement, then the expected balance,
 * e.g. "3,367.60 - 196.00 = 3,171.60".
 */
export function displayArithmetic(a: RowArithmetic): string {
  const operator = a.effectCents < 0 ? '-' : '+';
  return `${displayCents(a.previousCents)} ${operator} ${displayCents(Math.abs(a.effectCents))} = ${displayCents(a.expectedCents)}`;
}
