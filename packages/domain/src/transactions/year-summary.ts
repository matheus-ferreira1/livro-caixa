import { monthOf, pad2, type MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import { computeSettlement } from './month-summary';
import type { Transaction, TransactionType } from './transaction';

export const SUMMARY_MODES = ['real', 'proj'] as const;

/** "real" counts confirmed entries only; "proj" counts all of them plus the expected acerto. */
export type SummaryMode = (typeof SUMMARY_MODES)[number];

export type SummaryStatus = 'empty' | 'open' | 'closed';

export interface MonthSummary {
  incomeCents: Cents;
  expenseCents: Cents;
  settlementCents: Cents;
  balanceCents: Cents;
  /** Whether the mode counts any entry of the month. */
  hasData: boolean;
  /** Whether the month has no entries at all, whatever the mode. */
  isEmpty: boolean;
  hasPending: boolean;
}

export interface YearSummaryMonth extends MonthSummary {
  month: MonthKey;
  /** Running balance of the year; null after the last month with data. */
  accumulatedCents: Cents | null;
}

export interface YearSummaryTotals {
  incomeCents: Cents;
  expenseCents: Cents;
  settlementCents: Cents;
  balanceCents: Cents;
  activeMonths: number;
  averageExpenseCents: Cents;
  averageBalanceCents: Cents;
  bestMonth: { month: MonthKey; balanceCents: Cents } | null;
}

export interface YearSummary {
  year: number;
  mode: SummaryMode;
  months: YearSummaryMonth[];
  totals: YearSummaryTotals;
}

const MONTHS_IN_YEAR = 12;

export function monthSummary(
  monthTransactions: Transaction[],
  mode: SummaryMode,
  share: number,
): MonthSummary {
  const counted = mode === 'real' ? monthTransactions.filter((t) => t.confirmed) : monthTransactions;
  const totalOf = (type: TransactionType) =>
    sumCents(counted.filter((t) => t.type === type).map((t) => t.valueCents));
  const incomeCents = totalOf('receita');
  const expenseCents = totalOf('despesa');
  const settlementCents =
    mode === 'proj'
      ? Math.max(
          totalOf('acerto'),
          computeSettlement(monthTransactions, share, { includePending: true }).partnerCents,
        )
      : totalOf('acerto');
  return {
    incomeCents,
    expenseCents,
    settlementCents,
    balanceCents: incomeCents + settlementCents - expenseCents,
    hasData: counted.length > 0,
    isEmpty: monthTransactions.length === 0,
    hasPending: monthTransactions.some((t) => !t.confirmed),
  };
}

export function summaryStatus({ isEmpty, hasPending }: MonthSummary): SummaryStatus {
  if (isEmpty) return 'empty';
  return hasPending ? 'open' : 'closed';
}

const monthsOfYear = (year: number): MonthKey[] =>
  Array.from({ length: MONTHS_IN_YEAR }, (_, index) => `${year}-${pad2(index + 1)}`);

function withRunningTotal(months: (MonthSummary & { month: MonthKey })[]): YearSummaryMonth[] {
  const lastWithData = months.findLastIndex((m) => m.hasData);
  let running = 0;
  return months.map((m, index) => {
    if (m.hasData) running += m.balanceCents;
    return { ...m, accumulatedCents: index <= lastWithData ? running : null };
  });
}

// Adding zero turns the -0 that Math.round gives small negatives into 0, which formats without a sign.
export const averageOf = (totalCents: Cents, count: number): Cents =>
  count === 0 ? 0 : Math.round(totalCents / count) + 0;

function totalsOfYear(months: YearSummaryMonth[]): YearSummaryTotals {
  const active = months.filter((m) => m.hasData);
  const totalOf = (field: 'incomeCents' | 'expenseCents' | 'settlementCents' | 'balanceCents') =>
    sumCents(active.map((m) => m[field]));
  const best = active.reduce<YearSummaryMonth | null>(
    (highest, m) => (!highest || m.balanceCents > highest.balanceCents ? m : highest),
    null,
  );
  return {
    incomeCents: totalOf('incomeCents'),
    expenseCents: totalOf('expenseCents'),
    settlementCents: totalOf('settlementCents'),
    balanceCents: totalOf('balanceCents'),
    activeMonths: active.length,
    averageExpenseCents: averageOf(totalOf('expenseCents'), active.length),
    averageBalanceCents: averageOf(totalOf('balanceCents'), active.length),
    bestMonth: best && { month: best.month, balanceCents: best.balanceCents },
  };
}

/** The Resumo mensal of one year, from entries of any period. */
export function yearSummary(
  transactions: Transaction[],
  year: number,
  mode: SummaryMode,
  share: number,
): YearSummary {
  const months = withRunningTotal(
    monthsOfYear(year).map((month) => ({
      month,
      ...monthSummary(
        transactions.filter((t) => monthOf(t.date) === month),
        mode,
        share,
      ),
    })),
  );
  return { year, mode, months, totals: totalsOfYear(months) };
}
