import { describe, expect, it } from 'vitest';
import { detectDateOrder, findFullDates, inferYears, parseDateToken, resolveDayMonth } from '../../src/engine/dates.ts';

describe('parseDateToken', () => {
  it.each([
    ['03 Dec WOOLWORTHS', 'named', 3, 12, null],
    ['3 Dec 2025 Opening', 'named', 3, 12, 2025],
    ['05 Jan 26 Card purchase', 'named', 5, 1, 2026],
    ['Jan 05 Coffee', 'named', 5, 1, null],
    ['Jan 5, 2026 Coffee', 'named', 5, 1, 2026],
    ['01-Feb-2026 x', 'named', 1, 2, 2026],
    ['2026-03-02 Rent', 'iso', 2, 3, 2026],
    ['Sept 9 Fee', 'named', 9, 9, null],
    ['11 February 12,800.00', 'named', 11, 2, null],
    ['03 Dec 25.00', 'named', 3, 12, null],
  ] as const)('reads %s', (text, kind, day, month, year) => {
    const t = parseDateToken(text);
    expect(t?.kind).toBe(kind);
    expect(t?.day).toBe(day);
    expect(t?.month).toBe(month);
    expect(t?.year).toBe(year);
  });

  it('keeps numeric dates ambiguous until the order is known', () => {
    const t = parseDateToken('01/05 Payroll');
    expect(t?.kind).toBe('numeric');
    expect(t && resolveDayMonth(t, 'mdy')).toEqual({ day: 5, month: 1 });
    expect(t && resolveDayMonth(t, 'dmy')).toEqual({ day: 1, month: 5 });
  });

  it.each(['12.50 fee', '1,234.56', '45.00', '12:30 pm', 'Page 1 of 2', '13/13/2026', 'BPAY 12345', '100 Main St'])(
    'does not read %s as a date',
    (text) => {
      expect(parseDateToken(text)).toBeNull();
    },
  );

  it('reads dotted dates only with a year', () => {
    expect(parseDateToken('15.01.2026 x')?.year).toBe(2026);
    expect(parseDateToken('15.01 x')).toBeNull();
  });
});

describe('detectDateOrder', () => {
  const tok = (s: string) => {
    const t = parseDateToken(s);
    if (!t) throw new Error(`no date in ${s}`);
    return t;
  };
  it('uses parts above 12 to decide', () => {
    expect(detectDateOrder([tok('01/05'), tok('01/15')])).toBe('mdy');
    expect(detectDateOrder([tok('15/01/2026'), tok('02/03/2026')])).toBe('dmy');
  });
  it('falls back to the order that keeps dates in sequence', () => {
    expect(detectDateOrder([tok('01/02/2026'), tok('01/03/2026'), tok('01/04/2026')])).toBe('dmy');
    expect(detectDateOrder([tok('02/01/2026'), tok('03/01/2026'), tok('04/01/2026')])).toBe('dmy');
  });
});

describe('years', () => {
  it('finds statement period dates', () => {
    const found = findFullDates('Statement period 1 Dec 2025 to 28 Feb 2026');
    expect(found.map((d) => d.toISOString().slice(0, 10))).toEqual(['2025-12-01', '2026-02-28']);
    expect(findFullDates('January 1, 2026 through January 31, 2026')).toHaveLength(2);
  });

  it('rolls over December to January', () => {
    const anchors = findFullDates('1 Dec 2025 to 28 Feb 2026');
    const { years } = inferYears(
      [
        { day: 3, month: 12, year: null },
        { day: 30, month: 12, year: null },
        { day: 2, month: 1, year: null },
        { day: 20, month: 2, year: null },
      ],
      anchors,
    );
    expect(years).toEqual([2025, 2025, 2026, 2026]);
  });

  it('is not misled by an old date in the small print', () => {
    const anchors = findFullDates('Terms updated 1 July 2019. Period 1 Dec 2025 to 31 Dec 2025');
    const { years } = inferYears([{ day: 3, month: 12, year: null }], anchors);
    expect(years).toEqual([2025]);
  });

  it('handles newest-first statements across a year boundary', () => {
    const anchors = findFullDates('1 Dec 2025 to 31 Jan 2026');
    const { years } = inferYears(
      [
        { day: 20, month: 1, year: null },
        { day: 2, month: 1, year: null },
        { day: 28, month: 12, year: null },
      ],
      anchors,
    );
    expect(years).toEqual([2026, 2026, 2025]);
  });
});
