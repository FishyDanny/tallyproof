import { useState } from 'preact/hooks';
import { displayCents } from '../engine/money.ts';
import type { RowStatus, Transaction } from '../engine/types.ts';

const STATUS_TEXT: Record<RowStatus, string> = {
  verified: 'Checked',
  'verified-group': 'Checked',
  mismatch: 'Check this row',
  unchecked: 'Not checked',
};

const PAGE_SIZE = 200;

export function ResultTable({ transactions }: { transactions: Transaction[] }) {
  const [showAll, setShowAll] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const flagged = transactions.filter((t) => t.status === 'mismatch').length;
  const filtered = onlyFlagged ? transactions.filter((t) => t.status === 'mismatch') : transactions;
  const rows = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  if (transactions.length === 0) return null;
  return (
    <div class="table-wrap">
      {flagged > 0 && (
        <label class="filter">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.currentTarget.checked)} /> Show only the{' '}
          {flagged} row(s) that need checking
        </label>
      )}
      <table data-testid="transactions">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col" class="num">
              Amount
            </th>
            <th scope="col" class="num">
              Balance
            </th>
            <th scope="col">Check</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={`${t.date}-${i}`} class={`row-${t.status}`} title={t.status === 'mismatch' ? `As printed: ${t.source}` : undefined}>
              <td class="date">{t.date}</td>
              <td>{t.description}</td>
              <td class={`num ${t.amountCents < 0 ? 'out' : 'in'}`}>{displayCents(t.amountCents)}</td>
              <td class="num">{t.balanceCents === null ? '' : displayCents(t.balanceCents)}</td>
              <td class="status">{STATUS_TEXT[t.status]}</td>
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
