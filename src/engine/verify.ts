import { signedCents } from './money.ts';
import type { ParsedMoney } from './money.ts';
import type { AmountColumn, BalanceCheck, RowArithmetic, RowStatus, Transaction } from './types.ts';

export interface RowDraft {
  date: string;
  description: string;
  /** Money values on the row keyed by AmountColumn.id. */
  values: Map<number, ParsedMoney>;
  page: number;
  source: string;
}

export interface VerifyInput {
  drafts: RowDraft[];
  columns: AmountColumn[];
  /** Printed opening balances, most likely first. */
  openings: ParsedMoney[];
  /** Printed closing balances, most likely first. */
  closings: ParsedMoney[];
  /**
   * Balance checkpoints (brought/carried forward) printed before the row at the
   * given index. Ignored for newest-first statements.
   */
  checkpointsBefore: Map<number, ParsedMoney[]>;
  /** True when the statement lists the newest transaction first. */
  reversed: boolean;
}

export interface VerifyOutput {
  transactions: Transaction[];
  balance: BalanceCheck;
  liability: boolean;
  warnings: string[];
}

interface Part {
  column: AmountColumn;
  value: ParsedMoney;
}

interface WorkingRow {
  draft: RowDraft;
  parts: Part[];
  balance: number | null;
  /** Signed amount, money in positive. */
  amount: number;
  /** True when the sign came from a guess about unsigned values rather than the statement itself. */
  signGuessed: boolean;
  status: RowStatus;
  /** Set when this row's printed balance does not match: the sum it was checked with. */
  arithmetic: RowArithmetic | null;
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

/**
 * Work out the sign of every amount, then check each row against the running
 * balance: previous balance plus this row's movement must equal the printed
 * balance. Rows between two printed balances are checked as a group.
 */
export function verifyBalances(input: VerifyInput): VerifyOutput {
  const warnings: string[] = [];
  const balanceColumn = input.columns.find((c) => c.role === 'balance') ?? null;
  const ordered = input.reversed ? [...input.drafts].reverse() : input.drafts;

  const rows: WorkingRow[] = ordered.map((draft) => {
    const parts: Part[] = [];
    let balance: number | null = null;
    for (const [id, value] of draft.values) {
      const column = input.columns.find((c) => c.id === id);
      if (!column || column.role === 'ignore') continue;
      if (column.role === 'balance') balance = signedCents(value);
      else parts.push({ column, value });
    }
    return { draft, parts, balance, amount: 0, signGuessed: false, status: 'unchecked', arithmetic: null };
  });

  const openingCandidates = input.openings.map(signedCents);
  const closingCandidates = input.closings.map(signedCents);
  let opening: number | null = openingCandidates[0] ?? null;
  let closing: number | null = closingCandidates[0] ?? null;

  // Learn from the printed balances which way unsigned values go, and whether
  // the balance is a liability (it rises when money goes out, as on a credit card).
  const unsignedVotes = new Map<number, { up: number; down: number }>();
  let assetVotes = 0;
  let liabilityVotes = 0;
  let prev = opening;
  for (const row of rows) {
    if (row.balance === null) {
      prev = null;
      continue;
    }
    if (prev !== null && row.parts.length === 1) {
      const delta = row.balance - prev;
      const part = row.parts[0];
      if (part) {
        const known = knownSign(part);
        if (known !== null) {
          if (delta === known) assetVotes += 1;
          else if (delta === -known) liabilityVotes += 1;
        } else if (Math.abs(delta) === part.value.cents) {
          const v = unsignedVotes.get(part.column.id) ?? { up: 0, down: 0 };
          if (delta > 0) v.up += 1;
          else v.down += 1;
          unsignedVotes.set(part.column.id, v);
        }
      }
    }
    prev = row.balance;
  }

  const hasRunningBalance = balanceColumn !== null && rows.some((r) => r.balance !== null);
  const anySuffix = rows.some((r) => r.parts.some((p) => p.value.creditDebitSuffix && p.value.marker === 'positive'));
  const anyMinus = rows.some((r) => r.parts.some((p) => p.value.marker === 'negative' && !p.value.creditDebitSuffix));

  let liability = liabilityVotes > assetVotes;
  // Default for unsigned values in an "amount" column: card statements print
  // purchases unsigned and mark payments CR; bank statements mark withdrawals.
  let unsignedDefault = anySuffix && !anyMinus ? -1 : 1;

  const amountColumns = input.columns.filter((c) => c.role === 'amount');
  const columnDefault = new Map<number, number>();
  const sortedAmountColumns = [...amountColumns].sort((a, b) => a.right - b.right);
  for (const col of amountColumns) {
    const v = unsignedVotes.get(col.id);
    if (v && v.up + v.down > 0) {
      const effectSign = v.up >= v.down ? 1 : -1;
      columnDefault.set(col.id, liability ? -effectSign : effectSign);
      // When the balance proves a column is all debits or all credits, label it.
      const share = Math.max(v.up, v.down) / (v.up + v.down);
      if (sortedAmountColumns.length >= 2 && share >= 0.8 && col.source === 'position') {
        col.role = (liability ? -effectSign : effectSign) > 0 ? 'credit' : 'debit';
        col.source = 'balance-delta';
      }
    } else if (sortedAmountColumns.length === 2) {
      columnDefault.set(col.id, col === sortedAmountColumns[0] ? -1 : 1);
    }
  }

  const computeAmounts = (defaultSign: number): void => {
    for (const row of rows) {
      let total = 0;
      let guessed = false;
      for (const p of row.parts) {
        if (p.column.role === 'debit') total -= p.value.cents;
        else if (p.column.role === 'credit') total += p.value.cents;
        else if (p.value.marker === 'negative') total -= p.value.cents;
        else if (p.value.marker === 'positive') total += p.value.cents;
        else {
          total += (columnDefault.get(p.column.id) ?? defaultSign) * p.value.cents;
          guessed = true;
        }
      }
      row.amount = total;
      row.signGuessed = guessed;
    }
  };

  const effectOf = (row: WorkingRow): number => (liability ? -row.amount : row.amount);

  if (!hasRunningBalance) {
    // No running balance: decide the sign convention from opening and closing totals.
    if (opening !== null && closing !== null) {
      const combos: Array<{ sign: number; liab: boolean }> = [
        { sign: unsignedDefault, liab: unsignedDefault === -1 },
        { sign: -unsignedDefault, liab: unsignedDefault !== -1 },
        { sign: unsignedDefault, liab: unsignedDefault !== -1 },
        { sign: -unsignedDefault, liab: unsignedDefault === -1 },
      ];
      let matched = false;
      search: for (const combo of combos) {
        computeAmounts(combo.sign);
        const effect = sum(rows.map((r) => (combo.liab ? -r.amount : r.amount)));
        for (const o of openingCandidates) {
          for (const c of closingCandidates) {
            if (o + effect === c) {
              unsignedDefault = combo.sign;
              liability = combo.liab;
              opening = o;
              closing = c;
              matched = true;
              break search;
            }
          }
        }
      }
      if (!matched) {
        unsignedDefault = anySuffix && !anyMinus ? -1 : 1;
        liability = anySuffix && !anyMinus;
        computeAmounts(unsignedDefault);
      }
    } else {
      liability = anySuffix && !anyMinus;
      computeAmounts(unsignedDefault);
    }
    const effect = sum(rows.map(effectOf));
    const totalsMatch = opening !== null && closing !== null ? opening + effect === closing : null;
    for (const row of rows) row.status = totalsMatch === true ? 'verified-group' : 'unchecked';
    if (totalsMatch === false) {
      warnings.push(
        'Opening balance plus all transactions does not equal the closing balance. A row may be missing or misread; compare the totals with the statement.',
      );
    } else if (totalsMatch === null) {
      warnings.push('This statement has no running balance and no opening and closing balance were found, so rows could not be checked.');
    }
    return finish(rows, { openingCents: opening, closingCents: closing, totalsMatch }, liability, warnings);
  }

  computeAmounts(unsignedDefault);

  const firstBalanced = rows.findIndex((r) => r.balance !== null);
  const firstRow = rows[firstBalanced];
  if (firstRow && firstRow.balance !== null) {
    const movement = sum(rows.slice(0, firstBalanced + 1).map(effectOf));
    const agreeing = openingCandidates.find((o) => o + movement === firstRow.balance);
    if (agreeing !== undefined) opening = agreeing;
  }
  let lastBalanced = -1;
  rows.forEach((r, i) => {
    if (r.balance !== null) lastBalanced = i;
  });
  const lastRow = rows[lastBalanced];
  if (lastRow && lastRow.balance !== null) {
    const end = lastRow.balance + sum(rows.slice(lastBalanced + 1).map(effectOf));
    const agreeing = closingCandidates.find((c) => c === end);
    if (agreeing !== undefined) closing = agreeing;
  }

  // Walk the rows in date order, checking each printed balance.
  let running: number | null = opening;
  let pending: WorkingRow[] = [];
  let checkpointMismatch = 0;
  rows.forEach((row, index) => {
    for (const checkpoint of input.checkpointsBefore.get(index) ?? []) {
      const value = signedCents(checkpoint);
      if (running !== null) {
        const expected = running + sum(pending.map(effectOf));
        if (pending.length > 0) {
          for (const p of pending) p.status = expected === value ? 'verified-group' : 'mismatch';
          pending = [];
        } else if (expected !== value) {
          checkpointMismatch += 1;
        }
      }
      running = value;
    }

    if (row.balance === null) {
      pending.push(row);
      return;
    }
    if (running === null) {
      for (const p of pending) p.status = 'unchecked';
      row.status = 'unchecked';
      pending = [];
      running = row.balance;
      return;
    }
    const before = running + sum(pending.map(effectOf));
    if (before + effectOf(row) === row.balance) {
      row.status = pending.length > 0 ? 'verified-group' : 'verified';
      for (const p of pending) p.status = 'verified-group';
    } else if (row.signGuessed && pending.length === 0 && before - effectOf(row) === row.balance) {
      // The balance shows this unsigned value went the other way.
      row.amount = -row.amount;
      row.status = 'verified';
    } else {
      row.status = 'mismatch';
      row.arithmetic = { previousCents: before, effectCents: effectOf(row), expectedCents: before + effectOf(row) };
      for (const p of pending) p.status = 'mismatch';
      // If the next printed balance agrees with the amounts, only this row's
      // balance is wrong: keep the computed running total so one bad figure
      // does not also flag the row after it.
      const expected = before + effectOf(row);
      let lookahead = expected;
      for (let k = index + 1; k < rows.length; k += 1) {
        const next = rows[k];
        if (!next) break;
        lookahead += effectOf(next);
        if (next.balance !== null) {
          if (lookahead === next.balance) {
            pending = [];
            running = expected;
            return;
          }
          break;
        }
      }
    }
    pending = [];
    running = row.balance;
  });

  if (pending.length > 0) {
    if (running !== null && closing !== null) {
      const ok = running + sum(pending.map(effectOf)) === closing;
      for (const p of pending) p.status = ok ? 'verified-group' : 'mismatch';
    } else {
      for (const p of pending) p.status = 'unchecked';
    }
  }

  if (checkpointMismatch > 0) {
    warnings.push(
      'A "balance brought forward" figure does not match the balance before it. Transactions may be missing at a page break; compare the page totals with the statement.',
    );
  }

  const effectTotal = sum(rows.map(effectOf));
  const totalsMatch = opening !== null && closing !== null ? opening + effectTotal === closing : null;
  const mismatches = rows.filter((r) => r.status === 'mismatch').length;
  if (mismatches > 0) {
    warnings.push(
      `${mismatches} row(s) do not add up to the printed balance. They are highlighted; check them against the statement before importing.`,
    );
  }
  if (totalsMatch === false && mismatches === 0) {
    warnings.push('Opening balance plus all transactions does not equal the closing balance; check the first and last rows.');
  }
  if (opening === null && rows[0]?.status === 'unchecked') {
    warnings.push('No opening balance was found, so the first row could not be checked.');
  }
  return finish(rows, { openingCents: opening, closingCents: closing, totalsMatch }, liability, warnings);
}

function knownSign(part: Part): number | null {
  if (part.column.role === 'debit') return -part.value.cents;
  if (part.column.role === 'credit') return part.value.cents;
  if (part.value.marker === 'negative') return -part.value.cents;
  if (part.value.marker === 'positive') return part.value.cents;
  return null;
}

function finish(
  rows: WorkingRow[],
  balance: BalanceCheck,
  liability: boolean,
  warnings: string[],
): VerifyOutput {
  const transactions: Transaction[] = rows.map((r) => ({
    date: r.draft.date,
    description: r.draft.description,
    amountCents: r.amount,
    balanceCents: r.balance,
    page: r.draft.page,
    status: r.status,
    source: r.draft.source,
    ...(r.arithmetic ? { arithmetic: r.arithmetic } : {}),
  }));
  return { transactions, balance, liability, warnings };
}
