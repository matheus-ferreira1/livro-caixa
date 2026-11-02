import {
  formatCompactAmount,
  formatMoney,
  monthName,
  monthShortName,
  summaryStatus,
  type Cents,
  type MonthKey,
  type SummaryStatus,
  type YearSummary,
  type YearSummaryMonth,
  type YearSummaryTotals,
} from '@livro-caixa/domain';
import type { TileSpec } from '@/shared/SummaryTiles';

const NO_VALUE = '—';

const STATUS_LABELS: Record<SummaryStatus, string> = {
  empty: 'Sem lançamentos',
  open: 'Em aberto',
  closed: 'Fechado',
};

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

function summaryTiles(totals: YearSummaryTotals): TileSpec[] {
  const { activeMonths, bestMonth } = totals;
  return [
    {
      label: 'Receitas no ano',
      tone: 'income',
      value: formatMoney(totals.incomeCents),
      sub: `Mais ${formatMoney(totals.settlementCents)} em acertos`,
    },
    {
      label: 'Despesas no ano',
      tone: 'expense',
      value: formatMoney(totals.expenseCents),
      sub: `Média de ${formatMoney(totals.averageExpenseCents)} por mês`,
    },
    {
      label: 'Média de balanço mensal',
      negative: totals.averageBalanceCents < 0,
      value: formatMoney(totals.averageBalanceCents),
      sub: activeMonths
        ? `Em ${activeMonths} ${activeMonths === 1 ? 'mês' : 'meses'} com lançamentos`
        : 'Nenhum mês com lançamentos',
    },
    {
      label: 'Acumulado no ano',
      dark: true,
      negative: totals.balanceCents < 0,
      value: formatMoney(totals.balanceCents),
      sub: bestMonth
        ? `Melhor mês: ${monthName(bestMonth.month)} (${formatMoney(bestMonth.balanceCents)})`
        : 'Sem lançamentos no ano',
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

function barOf(m: YearSummaryMonth, { highest, percent }: ReturnType<typeof chartScale>): SummaryBar | null {
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
    compactLabel: formatCompactAmount(m.balanceCents),
    ariaLabel: `${monthName(m.month)}: balanço de ${formatMoney(m.balanceCents)}`,
  };
}

const moneyOrDash = (shown: boolean, cents: Cents) => (shown ? formatMoney(cents) : NO_VALUE);

/** Display data for the Resumo mensal, labeled as in the design. */
export function summaryViewModel(summary: YearSummary, currentMonth: MonthKey): SummaryViewModel {
  const { months, totals } = summary;
  const scale = chartScale(months);
  const largestAccumulated = Math.max(1, ...months.map((m) => Math.abs(m.accumulatedCents ?? 0)));

  return {
    tiles: summaryTiles(totals),
    zeroLineTop: scale.percent(scale.highest),
    months: months.map((m) => {
      const name = monthName(m.month);
      const status = summaryStatus(m);
      const hasSettlement = m.hasData && m.settlementCents > 0;
      const accumulated = m.accumulatedCents;
      return {
        month: m.month,
        name,
        shortName: monthShortName(m.month),
        isCurrent: m.month === currentMonth,
        income: moneyOrDash(m.hasData, m.incomeCents),
        expense: moneyOrDash(m.hasData, m.expenseCents),
        settlement: moneyOrDash(hasSettlement, m.settlementCents),
        hasData: m.hasData,
        hasSettlement,
        balance: moneyOrDash(m.hasData, m.balanceCents),
        balanceTone: !m.hasData ? 'muted' : m.balanceCents < 0 ? 'expense' : 'income',
        accumulated: accumulated === null ? NO_VALUE : formatMoney(accumulated),
        hasAccumulated: accumulated !== null,
        accumulatedWidth:
          accumulated === null ? '0%' : `${((Math.abs(accumulated) / largestAccumulated) * 100).toFixed(1)}%`,
        accumulatedNegative: accumulated !== null && accumulated < 0,
        statusLabel: STATUS_LABELS[status],
        statusTone: status,
        openLabel: `Ver lançamentos de ${name}`,
        href: `/lancamentos?mes=${m.month}`,
        bar: barOf(m, scale),
      };
    }),
    totals: {
      income: formatMoney(totals.incomeCents),
      expense: formatMoney(totals.expenseCents),
      settlement: formatMoney(totals.settlementCents),
      balance: formatMoney(totals.balanceCents),
      balanceTone: totals.balanceCents < 0 ? 'expense' : 'income',
    },
  };
}
