import { describe, expect, it } from 'vitest';
import { csvField, exportTransactions, fitId, toOfx, toQif, toXeroCsv } from '../../src/engine/export.ts';
import type { ExportOptions } from '../../src/engine/export.ts';
import type { Transaction } from '../../src/engine/types.ts';

const tx = (date: string, description: string, amountCents: number, balanceCents: number | null): Transaction => ({
  date,
  description,
  amountCents,
  balanceCents,
  page: 1,
  status: 'verified',
  source: '',
});

const rows: Transaction[] = [
  tx('2026-01-03', 'Coffee, "the good one"', -450, 99550),
  tx('2026-01-04', 'Salary & bonus <ACME>', 250000, 349550),
];
const opts: ExportOptions = { dateFormat: 'dd/mm/yyyy', currency: 'AUD', creditCard: false };

describe('csvField', () => {
  it('quotes commas and quotes', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(csvField('=HYPERLINK("x")')).toBe('" =HYPERLINK(""x"")"');
    expect(csvField('@SUM(A1)')).toBe('" @SUM(A1)"');
  });
});

describe('Xero CSV', () => {
  it('uses the field names Xero documents and dd/mm/yyyy dates', () => {
    const out = toXeroCsv(rows, opts).split('\r\n');
    expect(out[0]).toBe('Date,Amount,Payee,Description,Reference,Check Number');
    expect(out[1]).toBe('03/01/2026,-4.50,"Coffee, ""the good one""","Coffee, ""the good one""",,');
    expect(out[2]?.startsWith('04/01/2026,2500.00,')).toBe(true);
  });
  it('writes yyyy/mm/dd because Xero does not accept yyyy-mm-dd', () => {
    const out = toXeroCsv(rows, { ...opts, dateFormat: 'yyyy-mm-dd' }).split('\r\n');
    expect(out[1]?.startsWith('2026/01/03,')).toBe(true);
  });
});

describe('OFX', () => {
  it('escapes markup and writes signed amounts', () => {
    const ofx = toOfx(rows, opts);
    expect(ofx).toContain('<TRNAMT>-4.50');
    expect(ofx).toContain('<TRNTYPE>CREDIT');
    expect(ofx).toContain('Salary &amp; bonus &lt;ACME&gt;');
    expect(ofx).toContain('<DTSTART>20260103');
    expect(ofx).toContain('<BALAMT>3495.50');
    expect(ofx).not.toMatch(/<ACME>/);
  });
  it('gives stable unique ids', () => {
    expect(fitId(rows[0] as Transaction, 0)).toBe(fitId(rows[0] as Transaction, 0));
    expect(fitId(rows[0] as Transaction, 0)).not.toBe(fitId(rows[0] as Transaction, 1));
  });
  it('uses credit card structures and owed balances as negative', () => {
    const ofx = toOfx([tx('2026-01-05', 'Shop', -1000, 51000)], { ...opts, creditCard: true });
    expect(ofx).toContain('<CREDITCARDMSGSRSV1>');
    expect(ofx).toContain('<BALAMT>-510.00');
  });
});

describe('QIF', () => {
  it('writes one record per transaction', () => {
    const qif = toQif(rows, { ...opts, dateFormat: 'mm/dd/yyyy' });
    expect(qif.startsWith('!Type:Bank\r\n')).toBe(true);
    expect(qif).toContain('D01/03/2026\r\nT-4.50\r\n');
    expect(qif.match(/\^/g)).toHaveLength(2);
  });
});

describe('exportTransactions', () => {
  it('names files from the statement name', () => {
    const file = exportTransactions(rows, 'xero', opts, 'My Statement (Jan).pdf');
    expect(file.filename).toBe('My-Statement-Jan-xero.csv');
  });
});
