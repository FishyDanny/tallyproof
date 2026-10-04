import { describe, expect, it } from 'vitest';
import { PRICES } from '../../src/pricing.ts';
import { findPrices, SCRIPT_PATTERNS } from '../helpers/price-patterns.ts';

describe('price patterns', () => {
  it.each([
    'US$9 / month',
    'US$69 / year',
    'US$19 once',
    'Pro costs $9 a month.',
    'The pass is $19.',
    'or $69, billed yearly',
    'It is $69.00 for the year',
    'billed per month',
    'charged per year',
    'Buy the pass',
    'Upgrade to Pro',
    'Subscribe today',
    'the Catch-up Pass',
    'Download OFX (Pro)',
    'Available with Pro',
  ])('flags %s', (text) => {
    expect(findPrices(text).length).toBeGreaterThan(0);
  });

  it.each([
    // Example amounts in the credit card guide are not prices.
    'The closing balance should be 1,200.00 + 845.50 + 30.00 + 18.40 - 1,000.00 = $1,093.90.',
    'the statement opens with $1,200.00 owing',
    'a $30.00 annual fee and $18.40 of interest',
    'A transfer of $19.40 and one of $90',
    'Money in 1,000.00',
    'one statement at a time, per statement file',
    'Microsoft 365 subscription',
    'Free while in early access. Paid plans will come later.',
    'Catch-up bookkeeping from old bank statements',
    'Have a Pro licence key?',
  ])('leaves %s alone', (text) => {
    expect(findPrices(text)).toEqual([]);
  });

  it('flags every price the site can show', () => {
    for (const price of Object.values(PRICES)) {
      expect(findPrices(price).length, price).toBeGreaterThan(0);
    }
  });

  it('does not treat "$9" in minified script as a price', () => {
    expect(findPrices('a.replace(/x/,"$9$1")', SCRIPT_PATTERNS)).toEqual([]);
    expect(findPrices('label:"US$9 / month"', SCRIPT_PATTERNS).length).toBeGreaterThan(0);
  });
});
