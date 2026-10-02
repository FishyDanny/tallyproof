import type { DateOrder } from './types.ts';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH_NAME = '(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?';

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?![\d.])/;
const NUMERIC_WITH_YEAR = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})(?![\d.])/;
const NUMERIC_NO_YEAR = /^(\d{1,2})\/(\d{1,2})(?![\d./])/;
const DAY_MONTH = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?[\\s-]?${MONTH_NAME}(?:[\\s,-]+(\\d{4}|\\d{2}))?(?![\\d.:,])`, 'i');
const MONTH_DAY = new RegExp(`^${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?![\\d.:,])`, 'i');

/** A date as printed. Numeric dates keep both parts until the document's date order is known. */
export interface DateToken {
  kind: 'iso' | 'numeric' | 'named';
  /** For numeric dates: the first and second printed parts. For others: day and month. */
  first: number;
  second: number;
  /** Day and month when unambiguous (iso and named kinds). */
  day: number | null;
  month: number | null;
  year: number | null;
  /** Number of characters consumed from the start of the text. */
  length: number;
}

function expandYear(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (raw.length === 4) return n;
  return n >= 80 ? 1900 + n : 2000 + n;
}

function monthFromName(name: string): number | null {
  const key = name.toLowerCase().slice(0, name.toLowerCase().startsWith('sept') ? 4 : 3);
  return MONTHS[key] ?? null;
}

/** Try to read a date at the very start of `text`. */
export function parseDateToken(text: string): DateToken | null {
  const s = text.trimStart();
  let m = ISO.exec(s);
  if (m) {
    const [all, y, mo, d] = m as unknown as [string, string, string, string];
    const month = Number(mo);
    const day = Number(d);
    if (!validDay(day, month)) return null;
    return { kind: 'iso', first: month, second: day, day, month, year: Number(y), length: all.length };
  }
  m = NUMERIC_WITH_YEAR.exec(s);
  if (m) {
    const [all, a, , b, y] = m as unknown as [string, string, string, string, string];
    const first = Number(a);
    const second = Number(b);
    if (!plausibleNumeric(first, second)) return null;
    return { kind: 'numeric', first, second, day: null, month: null, year: expandYear(y), length: all.length };
  }
  m = NUMERIC_NO_YEAR.exec(s);
  if (m) {
    const [all, a, b] = m as unknown as [string, string, string];
    const first = Number(a);
    const second = Number(b);
    if (!plausibleNumeric(first, second)) return null;
    return { kind: 'numeric', first, second, day: null, month: null, year: null, length: all.length };
  }
  m = DAY_MONTH.exec(s);
  if (m) {
    const [all, d, mon, y] = m as unknown as [string, string, string, string | undefined];
    const month = monthFromName(mon);
    const day = Number(d);
    if (month === null || !validDay(day, month)) return null;
    return { kind: 'named', first: day, second: month, day, month, year: y ? expandYear(y) : null, length: all.length };
  }
  m = MONTH_DAY.exec(s);
  if (m) {
    const [all, mon, d, y] = m as unknown as [string, string, string, string | undefined];
    const month = monthFromName(mon);
    const day = Number(d);
    if (month === null || !validDay(day, month)) return null;
    return { kind: 'named', first: day, second: month, day, month, year: y ? Number(y) : null, length: all.length };
  }
  return null;
}

function validDay(day: number, month: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function plausibleNumeric(a: number, b: number): boolean {
  return a >= 1 && b >= 1 && a <= 31 && b <= 31 && (a <= 12 || b <= 12);
}

/** Resolve a token's day and month under a given order. Returns null if impossible. */
export function resolveDayMonth(token: DateToken, order: DateOrder): { day: number; month: number } | null {
  if (token.day !== null && token.month !== null) return { day: token.day, month: token.month };
  const [day, month] = order === 'mdy' ? [token.second, token.first] : [token.first, token.second];
  return validDay(day, month) ? { day, month } : null;
}

/**
 * Decide whether numeric dates are day-first or month-first. Any part above 12
 * settles it. Otherwise prefer the order under which dates run in sequence,
 * falling back to day-first.
 */
export function detectDateOrder(tokens: DateToken[]): DateOrder {
  const numeric = tokens.filter((t) => t.kind === 'numeric');
  if (numeric.length === 0) return tokens.some((t) => t.kind === 'iso') ? 'ymd' : 'dmy';
  if (numeric.some((t) => t.first > 12)) return 'dmy';
  if (numeric.some((t) => t.second > 12)) return 'mdy';
  const inversions = (order: DateOrder): number => {
    let count = 0;
    let prev = -1;
    for (const t of numeric) {
      const r = resolveDayMonth(t, order);
      if (!r) continue;
      const key = (t.year ?? 0) * 10000 + r.month * 100 + r.day;
      if (key < prev) count += 1;
      prev = key;
    }
    return count;
  };
  return inversions('mdy') < inversions('dmy') ? 'mdy' : 'dmy';
}

/** Find every date that has a year anywhere in a block of text (e.g. a statement period). */
export function findFullDates(text: string): Date[] {
  const found: Date[] = [];
  const pattern = new RegExp(
    `(\\d{1,2})(?:st|nd|rd|th)?[\\s-]${MONTH_NAME}[\\s,-]+(\\d{4})|${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})|(\\d{4})-(\\d{2})-(\\d{2})|(\\d{1,2})[/.](\\d{1,2})[/.](\\d{4})`,
    'gi',
  );
  for (const m of text.matchAll(pattern)) {
    let day: number | null = null;
    let month: number | null = null;
    let year: number | null = null;
    if (m[1] && m[2] && m[3]) {
      day = Number(m[1]); month = monthFromName(m[2]); year = Number(m[3]);
    } else if (m[4] && m[5] && m[6]) {
      month = monthFromName(m[4]); day = Number(m[5]); year = Number(m[6]);
    } else if (m[7] && m[8] && m[9]) {
      year = Number(m[7]); month = Number(m[8]); day = Number(m[9]);
    } else if (m[10] && m[11] && m[12]) {
      const a = Number(m[10]);
      const b = Number(m[11]);
      year = Number(m[12]);
      // Ambiguous here; assume day-first unless impossible. Only used to anchor years.
      [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
    }
    if (day !== null && month !== null && year !== null && validDay(day, month) && year >= 1990 && year <= 2100) {
      found.push(new Date(Date.UTC(year, month - 1, day)));
    }
  }
  return found;
}

export function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Assign years to dates printed without one. Starts from the year that places
 * the first date inside the statement period, then rolls the year forward each
 * time the month goes backwards (December to January).
 */
export function inferYears(
  dates: Array<{ day: number; month: number; year: number | null }>,
  anchors: Date[],
): { years: number[]; guessed: boolean } {
  const years: number[] = [];
  const firstYearless = dates.find((d) => d.year === null);
  if (!firstYearless) return { years: dates.map((d) => d.year ?? 0), guessed: false };

  let guessed = false;
  let year: number;
  const firstKnown = dates.find((d) => d.year !== null);
  if (firstKnown?.year != null && dates.indexOf(firstKnown) < dates.indexOf(firstYearless)) {
    year = firstKnown.year;
  } else if (anchors.length > 0) {
    // Pick the year that puts the first yearless date nearest to any anchor date,
    // so a stray date in the small print cannot outvote the statement period.
    const candidates = [...new Set(anchors.map((a) => a.getUTCFullYear()))];
    let best = candidates[0] ?? new Date().getUTCFullYear();
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const y of candidates) {
      const t = Date.UTC(y, firstYearless.month - 1, firstYearless.day);
      const distance = Math.min(...anchors.map((a) => Math.abs(a.getTime() - t)));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = y;
      }
    }
    year = best;
  } else if (firstKnown?.year != null) {
    year = firstKnown.year;
  } else {
    year = new Date().getUTCFullYear();
    guessed = true;
  }

  let prevMonth: number | null = null;
  for (const d of dates) {
    if (d.year !== null) {
      years.push(d.year);
      year = d.year;
      prevMonth = d.month;
      continue;
    }
    // A jump of six or more months can only be a year boundary: forwards for
    // oldest-first statements, backwards for newest-first ones.
    if (prevMonth !== null && prevMonth - d.month >= 6) year += 1;
    else if (prevMonth !== null && d.month - prevMonth >= 6) year -= 1;
    years.push(year);
    prevMonth = d.month;
  }
  return { years, guessed };
}
