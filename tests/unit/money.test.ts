import { describe, expect, it } from 'vitest';
import { displayCents, formatCents, parseMoney, signedCents } from '../../src/engine/money.ts';

describe('parseMoney', () => {
  it.each([
    ['1,234.56', 123456, 'none'],
    ['$1,250.00', 125000, 'none'],
    ['($123.45)', 12345, 'negative'],
    ['-45.00', 4500, 'negative'],
    ['45.00-', 4500, 'negative'],
    ['−45.00', 4500, 'negative'],
    ['-$45.00', 4500, 'negative'],
    ['$-45.00', 4500, 'negative'],
    ['+12.00', 1200, 'positive'],
    ['1,234.56 CR', 123456, 'positive'],
    ['1,234.56 DR', 123456, 'negative'],
    ['500.00Cr', 50000, 'positive'],
    ['0.05', 5, 'none'],
    ['1234567.89', 123456789, 'none'],
    ['£12.34', 1234, 'none'],
    ['.15', 15, 'none'],
    ['-.15', 15, 'negative'],
    ['= $3,664.79', 366479, 'none'],
  ] as const)('parses %s', (text, cents, marker) => {
    const parsed = parseMoney(text);
    expect(parsed).not.toBeNull();
    expect(parsed?.cents).toBe(cents);
    expect(parsed?.marker).toBe(marker);
  });

  it.each(['4.50%', '1234', '12.5', '1,23.45', '(12.00', '12.000', 'abc', '', '02/01', '1.234,56', 'Page 1 of 2'])(
    'rejects %s',
    (text) => {
      expect(parseMoney(text)).toBeNull();
    },
  );

  it('flags CR/DR suffixes', () => {
    expect(parseMoney('10.00 CR')?.creditDebitSuffix).toBe(true);
    expect(parseMoney('10.00')?.creditDebitSuffix).toBe(false);
  });
});

describe('cents helpers', () => {
  it('applies printed signs', () => {
    const neg = parseMoney('(1.50)');
    expect(neg && signedCents(neg)).toBe(-150);
  });
  it('formats without float drift', () => {
    expect(formatCents(-123456)).toBe('-1234.56');
    expect(formatCents(5)).toBe('0.05');
    expect(formatCents(0)).toBe('0.00');
    expect(displayCents(123456789)).toBe('1,234,567.89');
  });
});

describe('currency codes', () => {
  it.each([
    ['SGD 2,450.75', 245075, 'none'],
    ['AUD -12.00', 1200, 'negative'],
    ['HKD 1,234.56 CR', 123456, 'positive'],
    ['usd 3.00', 300, 'none'],
  ])('reads a value printed after its currency code: %s', (raw, cents, marker) => {
    expect(parseMoney(raw)).toMatchObject({ cents, marker });
  });

  it.each(['ATM 100.00', 'INV 250.00', 'REF 12.00', 'AUD', 'AUD 12'])('does not read description words as money: %s', (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});
