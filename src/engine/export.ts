import { formatCents } from './money.ts';
import type { Transaction } from './types.ts';

export type ExportFormat = 'csv' | 'xero' | 'quickbooks' | 'ofx' | 'qif';
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';

export interface ExportOptions {
  dateFormat: DateFormat;
  /** ISO 4217 code used in OFX files. */
  currency: string;
  /** Use credit card statement structures in OFX and QIF. */
  creditCard: boolean;
  /** Closing balance as printed (amount owed for credit cards), used when rows carry no balance. */
  closingCents?: number | null;
}

export interface ExportFile {
  filename: string;
  mimeType: string;
  content: string;
  /** Prefix a UTF-8 byte order mark so Excel reads the file correctly. Accounting importers do not need it. */
  bom: boolean;
}

/** Formats that only Pro unlocks. Generic CSV, Xero and QuickBooks CSV are free. */
export const PRO_FORMATS: ReadonlySet<ExportFormat> = new Set<ExportFormat>(['ofx', 'qif']);

export function formatDate(iso: string, format: DateFormat): string {
  const [y = '', m = '', d = ''] = iso.split('-');
  if (format === 'dd/mm/yyyy') return `${d}/${m}/${y}`;
  if (format === 'mm/dd/yyyy') return `${m}/${d}/${y}`;
  return iso;
}

/** Quote a CSV field when needed and stop spreadsheet apps treating text as a formula. */
export function csvField(value: string): string {
  let v = value;
  if (/^[=+@\t\r]/.test(v)) v = ` ${v}`;
  if (/[",\r\n]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function csv(rows: string[][]): string {
  return `${rows.map((r) => r.map(csvField).join(',')).join('\r\n')}\r\n`;
}

function statusLabel(t: Transaction): string {
  switch (t.status) {
    case 'verified':
    case 'verified-group':
      return 'verified';
    case 'mismatch':
      return 'CHECK';
    case 'unchecked':
      return 'unchecked';
  }
}

export function toGenericCsv(transactions: Transaction[], options: ExportOptions): string {
  const header = ['Date', 'Description', 'Debit', 'Credit', 'Amount', 'Balance', 'Check'];
  const body = transactions.map((t) => [
    formatDate(t.date, options.dateFormat),
    t.description,
    t.amountCents < 0 ? formatCents(-t.amountCents) : '',
    t.amountCents > 0 ? formatCents(t.amountCents) : '',
    formatCents(t.amountCents),
    t.balanceCents === null ? '' : formatCents(t.balanceCents),
    statusLabel(t),
  ]);
  return csv([header, ...body]);
}

/**
 * Xero's bank statement CSV fields (Date and Amount are required). Xero does not
 * list yyyy-mm-dd as an accepted date format, so that choice is written as yyyy/mm/dd.
 */
export function toXeroCsv(transactions: Transaction[], options: ExportOptions): string {
  const header = ['Date', 'Amount', 'Payee', 'Description', 'Reference', 'Check Number'];
  const body = transactions.map((t) => [
    xeroDate(t.date, options.dateFormat),
    formatCents(t.amountCents),
    t.description.slice(0, 255),
    t.description.slice(0, 255),
    '',
    '',
  ]);
  return csv([header, ...body]);
}

function xeroDate(iso: string, format: DateFormat): string {
  return format === 'yyyy-mm-dd' ? iso.replace(/-/g, '/') : formatDate(iso, format);
}

/** QuickBooks Online three-column bank upload: Date, Description, Amount. */
export function toQuickBooksCsv(transactions: Transaction[], options: ExportOptions): string {
  const header = ['Date', 'Description', 'Amount'];
  const body = transactions.map((t) => [formatDate(t.date, options.dateFormat), t.description, formatCents(t.amountCents)]);
  return csv([header, ...body]);
}

function sgmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\r\n]+/g, ' ');
}

function asciiOnly(value: string): string {
  return value.normalize('NFKD').replace(/[^\x20-\x7e]/g, '');
}

/** Stable identifier for a transaction so re-imports can be de-duplicated. */
export function fitId(t: Transaction, index: number): string {
  const key = `${t.date}|${t.amountCents}|${t.description}|${index}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i += 1) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return `${t.date.replace(/-/g, '')}${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/** OFX 1.0.2 (SGML), the version most accounting software accepts. */
export function toOfx(transactions: Transaction[], options: ExportOptions): string {
  const dates = transactions.map((t) => t.date.replace(/-/g, '')).sort();
  const start = dates[0] ?? '';
  const end = dates[dates.length - 1] ?? '';
  const last = transactions[transactions.length - 1];
  // OFX requires a ledger balance: use the last printed balance, else the closing balance.
  const ledger = last?.balanceCents ?? options.closingCents ?? null;
  const currency = /^[A-Z]{3}$/.test(options.currency) ? options.currency : 'AUD';

  const trn = transactions
    .map((t, i) => {
      const name = sgmlEscape(asciiOnly(t.description)).slice(0, 32) || 'Transaction';
      const memo = sgmlEscape(asciiOnly(t.description)).slice(0, 255);
      return [
        '<STMTTRN>',
        `<TRNTYPE>${t.amountCents < 0 ? 'DEBIT' : 'CREDIT'}`,
        `<DTPOSTED>${t.date.replace(/-/g, '')}`,
        `<TRNAMT>${formatCents(t.amountCents)}`,
        `<FITID>${fitId(t, i)}`,
        `<NAME>${name}`,
        `<MEMO>${memo}`,
        '</STMTTRN>',
      ].join('\n');
    })
    .join('\n');

  const ledgerBlock =
    ledger === null ? '' : `\n<LEDGERBAL>\n<BALAMT>${formatCents(options.creditCard ? -ledger : ledger)}\n<DTASOF>${end}\n</LEDGERBAL>`;
  const account = options.creditCard
    ? '<CCACCTFROM>\n<ACCTID>tallyproof\n</CCACCTFROM>'
    : '<BANKACCTFROM>\n<BANKID>000000\n<ACCTID>tallyproof\n<ACCTTYPE>CHECKING\n</BANKACCTFROM>';
  const [msgOpen, trnOpen, rsOpen, rsClose, trnClose, msgClose] = options.creditCard
    ? ['<CREDITCARDMSGSRSV1>', '<CCSTMTTRNRS>', '<CCSTMTRS>', '</CCSTMTRS>', '</CCSTMTTRNRS>', '</CREDITCARDMSGSRSV1>']
    : ['<BANKMSGSRSV1>', '<STMTTRNRS>', '<STMTRS>', '</STMTRS>', '</STMTTRNRS>', '</BANKMSGSRSV1>'];

  return [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    'SECURITY:NONE',
    'ENCODING:USASCII',
    'CHARSET:1252',
    'COMPRESSION:NONE',
    'OLDFILEUID:NONE',
    'NEWFILEUID:NONE',
    '',
    '<OFX>',
    '<SIGNONMSGSRSV1>',
    '<SONRS>',
    '<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>',
    `<DTSERVER>${end}`,
    '<LANGUAGE>ENG',
    '</SONRS>',
    '</SIGNONMSGSRSV1>',
    msgOpen,
    trnOpen,
    '<TRNUID>1',
    '<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>',
    rsOpen,
    `<CURDEF>${currency}`,
    account,
    '<BANKTRANLIST>',
    `<DTSTART>${start}`,
    `<DTEND>${end}`,
    trn,
    `</BANKTRANLIST>${ledgerBlock}`,
    rsClose,
    trnClose,
    msgClose,
    '</OFX>',
    '',
  ].join('\n');
}

export function toQif(transactions: Transaction[], options: ExportOptions): string {
  const lines = [options.creditCard ? '!Type:CCard' : '!Type:Bank'];
  for (const t of transactions) {
    lines.push(`D${formatDate(t.date, options.dateFormat)}`);
    lines.push(`T${formatCents(t.amountCents)}`);
    lines.push(`P${t.description.replace(/[\r\n]+/g, ' ').slice(0, 64)}`);
    lines.push(`M${t.description.replace(/[\r\n]+/g, ' ')}`);
    lines.push('^');
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function exportTransactions(
  transactions: Transaction[],
  format: ExportFormat,
  options: ExportOptions,
  baseName: string,
): ExportFile {
  const safeBase =
    baseName
      .replace(/\.pdf$/i, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'statement';
  switch (format) {
    case 'csv':
      return { filename: `${safeBase}.csv`, mimeType: 'text/csv', content: toGenericCsv(transactions, options), bom: true };
    case 'xero':
      return { filename: `${safeBase}-xero.csv`, mimeType: 'text/csv', content: toXeroCsv(transactions, options), bom: false };
    case 'quickbooks':
      return { filename: `${safeBase}-quickbooks.csv`, mimeType: 'text/csv', content: toQuickBooksCsv(transactions, options), bom: false };
    case 'ofx':
      return { filename: `${safeBase}.ofx`, mimeType: 'application/x-ofx', content: toOfx(transactions, options), bom: false };
    case 'qif':
      return { filename: `${safeBase}.qif`, mimeType: 'application/qif', content: toQif(transactions, options), bom: false };
  }
}
