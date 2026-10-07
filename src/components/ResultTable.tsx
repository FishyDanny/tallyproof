import { useState } from 'preact/hooks';
import { displayArithmetic, displayCents } from '../engine/money.ts';
import type { RowStatus, Transaction } from '../engine/types.ts';
import { FlagMark, OpenMark, TickMark } from './Marks.tsx';

const STATUS_TEXT: Record<RowStatus, string> = {
  verified: 'Checked',
  'verified-group': 'Checked',
  mismatch: 'Check this row',
  unchecked: 'Not checked',
};

function StatusMark({ status }: { status: RowStatus }) {
  if (status === 'mismatch') return <FlagMark class="status-mark" />;
  if (status === 'unchecked') return <OpenMark class="status-mark" />;
  return <TickMark class="status-mark" />;
}

/** The sum on a flagged row. On a narrow column it breaks only before the equals sign. */
function Arithmetic({ sum }: { sum: string }) {
  const [movement = sum, expected] = sum.split(' = ');
  return (
    <span class="arithmetic" data-testid="row-arithmetic">
      <span>{movement}</span>
      {expected !== undefined && (
        <>
          {' '}
          <span>= {expected}</span>
        </>
      )}
    </span>
  );
}

const PAGE_SIZE = 200;

export function ResultTable({ transactions }: { transactions: Transaction[] }) {
  const [showAll, setShowAll] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const flagged = transactions.filter((t) => t.status === 'mismatch').length;
  const filtered = onlyFlagged ? transactions.filter((t) => t.status === 'mismatch') : transactions;
  const rows = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  if (transactions.length === 0) return null;
  return (
    <div class="table-wrap reflow">
      {flagged > 0 && (
        <label class="filter">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.currentTarget.checked)} /> Show only the{' '}
          {flagged} row(s) that need checking
        </label>
      )}
      <table data-testid="transactions" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Date</th>
            <th scope="col" role="columnheader">Description</th>
            <th scope="col" role="columnheader" class="num">
              Amount
            </th>
            <th scope="col" role="columnheader" class="num">
              Balance
            </th>
            <th scope="col" role="columnheader">Check</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((t, i) => (
            <tr role="row" key={`${t.date}-${i}`} class={`row-${t.status}`}>
              <td role="cell" class="date">{t.date}</td>
              <td role="cell">{t.description}</td>
              <td role="cell" class={`num ${t.amountCents < 0 ? 'out' : 'in'}`}>{displayCents(t.amountCents)}</td>
              <td role="cell" class="num">
                {t.balanceCents !== null && (
                  <>
                    {/* The column header is hidden when rows reflow on phones, so the figure carries its own name there. */}
                    <span class="cell-label" aria-hidden="true">
                      Balance{' '}
                    </span>
                    {displayCents(t.balanceCents)}
                  </>
                )}
              </td>
              <td role="cell" class="status">
                <span class="status-word">
                  <StatusMark status={t.status} />
                  {STATUS_TEXT[t.status]}
                </span>
                {/* A flagged row shows its sum and the line as read from the PDF, so the check can be followed without hovering. */}
                {t.arithmetic && <Arithmetic sum={displayArithmetic(t.arithmetic)} />}
                {t.status === 'mismatch' && <span class="as-printed">As printed: {t.source}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!showAll && filtered.length > PAGE_SIZE && (
        <button type="button" class="secondary" onClick={() => setShowAll(true)}>
          Show all {filtered.length} rows
        </button>
      )}
    </div>
  );
}
