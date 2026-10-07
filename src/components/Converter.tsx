import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { convertStatement } from '../engine/convert.ts';
import { PdfPasswordError } from '../engine/extract.ts';
import { exportTransactions, PRO_FORMATS } from '../engine/export.ts';
import type { DateFormat, ExportFormat } from '../engine/export.ts';
import { mergeStatements } from '../engine/merge.ts';
import { displayCents } from '../engine/money.ts';
import type { ColumnRole, ConversionOptions, ConversionResult, DateOrder, PageText, Transaction } from '../engine/types.ts';
import { downloadFile } from '../lib/download.ts';
import { preloadPdfJs, readStatement } from '../lib/pdf-browser.ts';
import { isActive, licenceConfig, loadStoredLicence, needsRecheck, validateLicence } from '../lib/licence.ts';
import { PRICES_VISIBLE } from '../pricing.ts';
import { CURRENCIES, loadCurrency, loadDateFormat, saveCurrency, saveDateFormat } from '../lib/settings.ts';
import type { Currency } from '../lib/settings.ts';
import type { LicenceState } from '../lib/licence.ts';
import { AlertMark, DocMark, SealMark } from './Marks.tsx';
import { LicencePanel } from './LicencePanel.tsx';
import { PrivacyMeter } from './PrivacyMeter.tsx';
import { ResultTable } from './ResultTable.tsx';

interface Statement {
  id: number;
  fileName: string;
  pages: PageText[];
  options: ConversionOptions;
  result: ConversionResult;
}

interface FailedFile {
  fileName: string;
  message: string;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV (Excel, Google Sheets)',
  xero: 'Xero CSV',
  quickbooks: 'QuickBooks Online CSV',
  ofx: 'OFX',
  qif: 'QIF',
};

const ROLE_LABELS: Record<ColumnRole, string> = {
  debit: 'Money out',
  credit: 'Money in',
  amount: 'Amount (signed)',
  balance: 'Balance',
  ignore: 'Ignore',
};

let nextId = 1;

function defaultDateFormat(order: DateOrder): DateFormat {
  return order === 'mdy' ? 'mm/dd/yyyy' : 'dd/mm/yyyy';
}

export default function Converter() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [failed, setFailed] = useState<FailedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | 'merged' | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat | null>(null);
  const [chosenAt, setChosenAt] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [licence, setLicence] = useState<LicenceState | null>(null);
  const [currency, setCurrency] = useState<Currency>('AUD');
  const inputRef = useRef<HTMLInputElement>(null);

  const pro = isActive(licence);
  const licensing = licenceConfig();

  useEffect(() => {
    const stored = loadStoredLicence();
    setLicence(stored);
    const config = licenceConfig();
    if (stored && config && needsRecheck(stored)) {
      // Re-check the key once a day so a refunded or expired key stops working.
      // If Polar cannot be reached, the stored key keeps working until the next visit.
      validateLicence(stored.key, config).then(setLicence, () => undefined);
    }
    setDateFormat(loadDateFormat());
    setCurrency(loadCurrency());
    // Load the PDF reader now so that nothing at all is fetched once a file is chosen.
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => preloadPdfJs());
    else setTimeout(preloadPdfJs, 200);
  }, []);

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const pdfs = Array.from(list).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setNotice('Please choose a PDF bank statement.');
        return;
      }
      setChosenAt(performance.now());
      let files = pdfs;
      if (!pro && pdfs.length > 1) {
        files = pdfs.slice(0, 1);
        const name = pdfs[0]?.name ?? '';
        // A conditional on the constant, not a helper call, so the unused wording is dropped from the built script.
        setNotice(
          PRICES_VISIBLE
            ? `The free version converts one statement at a time, so only "${name}" was converted. Pro converts many at once and merges them into one file.`
            : `Statements are converted one statement at a time for now, so only "${name}" was converted. Converting many at once and merging them into one file are not available yet.`,
        );
      } else {
        setNotice(null);
      }
      setBusy(true);
      const added: Statement[] = [];
      const errors: FailedFile[] = [];
      for (const file of files) {
        try {
          const pages = await readStatement(file);
          const result = convertStatement(pages);
          added.push({ id: nextId++, fileName: file.name, pages, options: {}, result });
        } catch (error) {
          const message =
            error instanceof PdfPasswordError
              ? error.message
              : 'This file could not be read as a PDF. If it opens normally on your computer, try downloading the statement again.';
          errors.push({ fileName: file.name, message });
        }
      }
      setBusy(false);
      setFailed(errors);
      setStatements((prev) => (pro ? [...prev, ...added] : added));
      const first = added[0];
      if (first) {
        setActiveId(pro && statements.length + added.length > 1 ? 'merged' : first.id);
        setDateFormat((current) => current ?? defaultDateFormat(first.result.dateOrder));
      }
    },
    [pro, statements.length],
  );

  const onDrop = (e: JSX.TargetedEvent<HTMLElement, DragEvent>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files);
  };

  const updateOptions = (id: number, patch: ConversionOptions) => {
    setStatements((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const options: ConversionOptions = {
          ...s.options,
          ...patch,
          columnRoles: { ...s.options.columnRoles, ...patch.columnRoles },
        };
        return { ...s, options, result: convertStatement(s.pages, options) };
      }),
    );
  };

  const active = typeof activeId === 'number' ? statements.find((s) => s.id === activeId) ?? null : null;
  const merged = useMemo(() => (statements.length > 1 ? mergeStatements(statements.map((s) => s.result.transactions)) : null), [statements]);

  const viewTransactions: Transaction[] = activeId === 'merged' ? merged?.transactions ?? [] : active?.result.transactions ?? [];
  const liability = activeId === 'merged' ? statements.some((s) => s.result.liabilityBalance) : active?.result.liabilityBalance ?? false;
  const effectiveDateFormat = dateFormat ?? 'dd/mm/yyyy';

  const exportAs = (format: ExportFormat) => {
    if (PRO_FORMATS.has(format) && !pro) return;
    const name = activeId === 'merged' ? 'statements-merged' : active?.fileName ?? 'statement';
    // For a merged file, the closing balance is the one on the most recent statement.
    const latest = [...statements].sort((a, b) =>
      (a.result.transactions.at(-1)?.date ?? '').localeCompare(b.result.transactions.at(-1)?.date ?? ''),
    ).at(-1);
    const closingCents = (activeId === 'merged' ? latest : active)?.result.balance.closingCents ?? null;
    downloadFile(
      exportTransactions(viewTransactions, format, { dateFormat: effectiveDateFormat, currency, creditCard: liability, closingCents }, name),
    );
  };

  // Formats that cannot be used yet sit on their own quieter row, after the ones that work.
  const formats = Object.keys(FORMAT_LABELS) as ExportFormat[];
  const isProLocked = (format: ExportFormat): boolean => PRO_FORMATS.has(format) && !pro;
  const isLocked = (format: ExportFormat): boolean => isProLocked(format) || (activeId === 'merged' && !pro);
  const exportButton = (format: ExportFormat, locked: boolean) => {
    const proLocked = isProLocked(format);
    return (
      <button
        type="button"
        key={format}
        class={locked ? 'locked' : ''}
        disabled={locked || viewTransactions.length === 0}
        title={proLocked ? (PRICES_VISIBLE ? 'Available with Pro' : 'Not available yet') : undefined}
        onClick={() => exportAs(format)}
      >
        Download {FORMAT_LABELS[format]}
        {proLocked ? (PRICES_VISIBLE ? ' (Pro)' : ' (not available yet)') : ''}
      </button>
    );
  };

  const reset = () => {
    setStatements([]);
    setFailed([]);
    setNotice(null);
    setActiveId(null);
    setChosenAt(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div class="converter">
      <div class="converter-bar">Bank statement converter</div>
      <div class="converter-body">
        <label
          class={`dropzone ${dragging ? 'dragging' : ''} ${busy ? 'busy' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            data-testid="file-input"
            onChange={(e) => {
              const files = e.currentTarget.files;
              if (files) void handleFiles(files);
            }}
          />
          <DocMark class="doc-mark" />
          <span class="dropzone-title">{busy ? 'Reading your statement…' : 'Choose a PDF bank statement'}</span>
          <span class="dropzone-sub">or drag it here. It is read on this device and never uploaded.</span>
        </label>

        <PrivacyMeter since={chosenAt} />
        {notice && (
          <p class="notice" role="status">
            <AlertMark class="note-mark" />
            <span>{notice}</span>
          </p>
        )}
        {failed.map((f) => (
          <p class="error" role="alert" key={f.fileName}>
            <AlertMark class="note-mark" />
            <span>
              <strong>{f.fileName}:</strong> {f.message}
            </span>
          </p>
        ))}

        {statements.length > 0 && (
          <section class="results" aria-label="Conversion results" data-testid="results">
            {statements.length > 1 && (
              <div class="tabs" role="tablist">
                <button type="button" role="tab" aria-selected={activeId === 'merged'} onClick={() => setActiveId('merged')}>
                  All statements merged
                </button>
                {statements.map((s) => (
                  <button type="button" role="tab" key={s.id} aria-selected={activeId === s.id} onClick={() => setActiveId(s.id)}>
                    {s.fileName}
                  </button>
                ))}
              </div>
            )}

            {active && <Summary statement={active} />}
            {activeId === 'merged' && merged && (
              <p class="summary-line">
                {merged.transactions.length} transactions from {statements.length} statements
                {merged.duplicatesRemoved > 0 ? `, ${merged.duplicatesRemoved} duplicate rows from overlapping statements removed` : ''}.
              </p>
            )}

            <div class="controls">
              <label>
                Date format in export
                <select
                  value={effectiveDateFormat}
                  onChange={(e) => {
                    const value = e.currentTarget.value as DateFormat;
                    setDateFormat(value);
                    saveDateFormat(value);
                  }}
                >
                  <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                  <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                  <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                </select>
              </label>
              <label>
                Currency (OFX files)
                <select
                  value={currency}
                  onChange={(e) => {
                    const value = e.currentTarget.value as Currency;
                    setCurrency(value);
                    saveCurrency(value);
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {active && (
                <>
                  <label>
                    Dates on the statement are
                    <select
                      value={active.options.dateOrder ?? 'auto'}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        updateOptions(active.id, v === 'auto' ? { dateOrder: undefined } : { dateOrder: v as DateOrder });
                      }}
                    >
                      <option value="auto">Detected automatically ({active.result.dateOrder})</option>
                      <option value="dmy">Day first (31/01)</option>
                      <option value="mdy">Month first (01/31)</option>
                    </select>
                  </label>
                  {active.result.columns.length > 0 && (
                    <details class="columns">
                      <summary>Columns found ({active.result.columns.length})</summary>
                      <p>If amounts look wrong, tell the converter what each money column holds.</p>
                      {[...active.result.columns]
                        .sort((a, b) => a.right - b.right)
                        .map((col, i) => (
                          <label key={col.id}>
                            Money column {i + 1}
                            <select
                              value={col.role}
                              onChange={(e) => updateOptions(active.id, { columnRoles: { [col.id]: e.currentTarget.value as ColumnRole } })}
                            >
                              {(Object.keys(ROLE_LABELS) as ColumnRole[]).map((r) => (
                                <option value={r} key={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                    </details>
                  )}
                </>
              )}
            </div>

            <div class="exports" data-testid="exports">
              <div class="exports-main">
                <div class="exports-downloads">{formats.filter((format) => !isLocked(format)).map((format) => exportButton(format, false))}</div>
                <button type="button" class="secondary" onClick={reset}>
                  Start again
                </button>
              </div>
              {formats.some(isLocked) && <div class="exports-later">{formats.filter(isLocked).map((format) => exportButton(format, true))}</div>}
            </div>

            <ResultTable transactions={viewTransactions} />
          </section>
        )}

        <LicencePanel licence={licence} onChange={setLicence} configured={licensing !== null} />
      </div>
    </div>
  );
}

function Summary({ statement }: { statement: Statement }) {
  const { result } = statement;
  const s = result.summary;
  const allGood = s.mismatched === 0 && s.unchecked === 0 && s.transactions > 0;
  return (
    <div class={`summary ${allGood ? 'good' : s.mismatched > 0 ? 'bad' : 'partial'}`} data-testid="summary">
      {allGood ? <SealMark class="summary-mark" /> : <AlertMark class="summary-mark" />}
      <div>
        <p class="summary-line">
          <strong>{s.transactions} transactions</strong> found in {statement.fileName}.{' '}
          <span data-testid="verified-count">{s.verified} checked against the printed balance</span>
          {s.mismatched > 0 && <span class="bad-text">, {s.mismatched} need checking</span>}
          {s.unchecked > 0 && <span>, {s.unchecked} could not be checked</span>}.
        </p>
        <p class="totals">
          Money in {displayCents(s.moneyInCents)} &middot; Money out {displayCents(s.moneyOutCents)}
          {result.balance.openingCents !== null && <> &middot; Opening {displayCents(result.balance.openingCents)}</>}
          {result.balance.closingCents !== null && <> &middot; Closing {displayCents(result.balance.closingCents)}</>}
          {result.balance.totalsMatch === true && <> &middot; Totals add up</>}
          {result.liabilityBalance && <> &middot; Credit card or loan statement</>}
        </p>
        {result.warnings.length > 0 && (
          <ul class="warnings">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
