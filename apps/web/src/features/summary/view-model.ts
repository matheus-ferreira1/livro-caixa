import {
  formatCompactAmount,
  monthName,
  monthShortName,
  summaryStatus,
  type Cents,
  type Localization,
  type MessageKey,
  type MonthKey,
  type SummaryStatus,
  type YearSummary,
  type YearSummaryMonth,
  type YearSummaryTotals,
} from '@livro-caixa/domain';
import type { TileSpec } from '@/shared/SummaryTiles';

const NO_VALUE = '—';

const STATUS_KEYS = {
  empty: 'summary.statusEmpty',
  open: 'summary.statusOpen',
  closed: 'summary.statusClosed',
} as const satisfies Record<SummaryStatus, MessageKey>;

export type BarTone = 'surplus' | 'surplus-pending' | 'deficit' | 'deficit-pending';

export interface SummaryBar {
  top: string;
  height: string;
  labelTop: string;
  positive: boolean;
  tone: BarTone;
  compactLabel: string;
  ariaLabel: string;
}

export interface SummaryMonthRow {
  month: MonthKey;
  name: string;
  shortName: string;
  isCurrent: boolean;
  income: string;
  expense: string;
  settlement: string;
  hasData: boolean;
  hasSettlement: boolean;
  balance: string;
  balanceTone: 'muted' | 'income' | 'expense';
  accumulated: string;
  hasAccumulated: boolean;
  accumulatedWidth: string;
  accumulatedNegative: boolean;
  statusLabel: string;
  statusTone: SummaryStatus;
  openLabel: string;
  href: string;
  bar: SummaryBar | null;
}

export interface SummaryViewModel {
  tiles: TileSpec[];
  months: SummaryMonthRow[];
  zeroLineTop: string;
  totals: {
    income: string;
    expense: string;
    settlement: string;
    balance: string;
    balanceTone: 'income' | 'expense';
  };
}

function summaryTiles(totals: YearSummaryTotals, { t, money }: Localization): TileSpec[] {
  const { activeMonths, bestMonth } = totals;
  const formatMoney = money.format;
  return [
    {
      label: t('summary.tileIncome'),
      tone: 'income',
      value: formatMoney(totals.incomeCents),
      sub: t('summary.tileIncomeSub', formatMoney(totals.settlementCents)),
    },
    {
      label: t('summary.tileExpense'),
      tone: 'expense',
      value: formatMoney(totals.expenseCents),
      sub: t('summary.tileExpenseSub', formatMoney(totals.averageExpenseCents)),
    },
    {
      label: t('summary.tileAverage'),
      negative: totals.averageBalanceCents < 0,
      value: formatMoney(totals.averageBalanceCents),
      sub: activeMonths ? t('summary.tileAverageSub', activeMonths) : t('summary.tileAverageNone'),
    },
    {
      label: t('summary.tileAccumulated'),
      dark: true,
      negative: totals.balanceCents < 0,
      value: formatMoney(totals.balanceCents),
      sub: bestMonth
        ? t('summary.tileAccumulatedBest', monthName(bestMonth.month, t), formatMoney(bestMonth.balanceCents))
        : t('summary.tileAccumulatedNone'),
    },
  ];
}

/** Maps balances to vertical positions: the highest sits at 0% and the lowest at 100%. */
function chartScale(months: YearSummaryMonth[]) {
  const balances = months.filter((m) => m.hasData).map((m) => m.balanceCents);
  const highest = Math.max(0, ...balances);
  const range = highest - Math.min(0, ...balances) || 1;
  return { highest, percent: (cents: Cents) => `${((cents / range) * 100).toFixed(2)}%` };
}

function barOf(
  m: YearSummaryMonth,
  { highest, percent }: ReturnType<typeof chartScale>,
  { t, money, language }: Localization,
): SummaryBar | null {
  if (!m.hasData) return null;
  const positive = m.balanceCents >= 0;
  const top = positive ? highest - m.balanceCents : highest;
  const height = Math.abs(m.balanceCents);
  const base: BarTone = positive ? 'surplus' : 'deficit';
  return {
    top: percent(top),
    height: `max(2px, ${percent(height)})`,
    labelTop: positive ? `calc(${percent(top)} - 20px)` : `calc(${percent(top + height)} + 4px)`,
    positive,
    tone: m.hasPending ? `${base}-pending` : base,
    compactLabel: formatCompactAmount(m.balanceCents, language),
    ariaLabel: t('summary.barLabel', monthName(m.month, t), money.format(m.balanceCents)),
  };
}

const moneyOrDash = (money: Localization['money'], shown: boolean, cents: Cents) =>
  shown ? money.format(cents) : NO_VALUE;

/** Display data for the Resumo mensal, labeled as in the design. */
export function summaryViewModel(
  summary: YearSummary,
  currentMonth: MonthKey,
  l10n: Localization,
): SummaryViewModel {
  const { t, money } = l10n;
  const { months, totals } = summary;
  const scale = chartScale(months);
  const largestAccumulated = Math.max(1, ...months.map((m) => Math.abs(m.accumulatedCents ?? 0)));

  return {
    tiles: summaryTiles(totals, l10n),
    zeroLineTop: scale.percent(scale.highest),
    months: months.map((m) => {
      const name = monthName(m.month, t);
      const status = summaryStatus(m);
      const hasSettlement = m.hasData && m.settlementCents > 0;
      const accumulated = m.accumulatedCents;
      return {
        month: m.month,
        name,
        shortName: monthShortName(m.month, t),
        isCurrent: m.month === currentMonth,
        income: moneyOrDash(money, m.hasData, m.incomeCents),
        expense: moneyOrDash(money, m.hasData, m.expenseCents),
        settlement: moneyOrDash(money, hasSettlement, m.settlementCents),
        hasData: m.hasData,
        hasSettlement,
        balance: moneyOrDash(money, m.hasData, m.balanceCents),
        balanceTone: !m.hasData ? 'muted' : m.balanceCents < 0 ? 'expense' : 'income',
        accumulated: accumulated === null ? NO_VALUE : money.format(accumulated),
        hasAccumulated: accumulated !== null,
        accumulatedWidth:
          accumulated === null ? '0%' : `${((Math.abs(accumulated) / largestAccumulated) * 100).toFixed(1)}%`,
        accumulatedNegative: accumulated !== null && accumulated < 0,
        statusLabel: t(STATUS_KEYS[status]),
        statusTone: status,
        openLabel: t('summary.openMonth', name),
        href: `/lancamentos?mes=${m.month}`,
        bar: barOf(m, scale, l10n),
      };
    }),
    totals: {
      income: money.format(totals.incomeCents),
      expense: money.format(totals.expenseCents),
      settlement: money.format(totals.settlementCents),
      balance: money.format(totals.balanceCents),
      balanceTone: totals.balanceCents < 0 ? 'expense' : 'income',
    },
  };
}
