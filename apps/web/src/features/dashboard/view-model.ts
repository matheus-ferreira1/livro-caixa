import {
  CATEGORY_PALETTE,
  dateParts,
  formatCompactAmount,
  MINUS,
  monthLabel,
  monthName,
  niceAxis,
  numberMarks,
  OTHERS_SLICE_ID,
  relativeDue,
  type AverageComparison,
  type CategoryBreakdown,
  type CategorySlice,
  type Dashboard,
  type DashboardKpis,
  type DashboardMonth,
  type DueTone,
  type IsoDate,
  type Localization,
  type MessageKey,
  type MonthKey,
  type OpenItems,
  type SettlementCard,
  type SettlementCardStatus,
} from '@livro-caixa/domain';
import { TYPE_META } from '@/features/transactions/view-model';
import { monthAxisLabel, tooltipAlignOf, type TooltipAlign } from '@/shared/lib/month-chart';
import type { TileDelta, TileSpec } from '@/shared/SummaryTiles';

const NO_VALUE = '—';

export const DONUT_RADIUS = 80;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_SEGMENT_GAP = 2;
// Unknown colors sit after the palette, and "Outras" after everything else.
const UNKNOWN_COLOR_RANK = 50;
const OTHERS_RANK = 99;

export interface ChartTick {
  label: string;
  top: string;
  isZero: boolean;
}

export interface ChartGroup {
  month: MonthKey;
  label: string;
  current: boolean;
  incomeHeight: string;
  expenseHeight: string;
  tooltipAlign: TooltipAlign;
  title: string;
  hasData: boolean;
  income: string;
  expense: string;
  settlement: string;
  balance: string;
  ariaLabel: string;
}

export interface DonutCenter {
  title: string;
  value: string;
  sub: string;
}

export interface DonutSegment {
  id: string;
  color: string;
  dash: string;
  offset: string;
}

export interface DonutLegendItem {
  id: string;
  name: string;
  color: string;
  value: string;
  percent: string;
  delta: TileDelta;
  center: DonutCenter;
}

export interface DonutViewModel {
  segments: DonutSegment[];
  legend: DonutLegendItem[];
  center: DonutCenter;
  ariaLabel: string;
}

export interface OpenRow {
  id: string;
  description: string;
  day: string;
  when: string;
  whenTone: DueTone;
  meta: string;
  value: string;
  valueClass: string;
  confirmLabel: string;
}

export interface OpenViewModel {
  summary: string;
  outflow: string;
  inflow: string;
  rows: OpenRow[];
  more: { label: string; href: string } | null;
}

export type SettlementTone = 'none' | 'open' | 'settled';

export interface SettlementViewModel {
  status: string;
  statusTone: SettlementTone;
  pending: string;
  expected: string;
  progress: string;
  progressAria: string;
  detail: string;
}

export interface DashboardViewModel {
  tiles: TileSpec[];
  chart: { ticks: ChartTick[]; groups: ChartGroup[] };
  donut: DonutViewModel | null;
  open: OpenViewModel;
  settlement: SettlementViewModel;
  tableHref: string;
}

type Words = Pick<Localization, 't' | 'money'>;

const neutral = (label: string): TileDelta => ({ label, tone: 'neutral', direction: null });

function balanceDelta(
  { hasData, previousHasData, previousMonth, differenceCents }: DashboardKpis['balance'],
  { t, money }: Words,
) {
  if (!hasData) return neutral(t('dashboard.noEntriesInMonth'));
  const previous = monthName(previousMonth, t);
  if (!previousHasData) return neutral(t('dashboard.noDataFor', previous));
  const better = differenceCents >= 0;
  const amount = money.format(Math.abs(differenceCents));
  return {
    label: better
      ? t('dashboard.balanceMore', amount, previous)
      : t('dashboard.balanceLess', amount, previous),
    tone: better ? 'good' : 'bad',
    direction: better ? 'up' : 'down',
  } satisfies TileDelta;
}

function savingsDelta(points: number | null, { t, money }: Words): TileDelta {
  if (points === null) return neutral(t('dashboard.noAverage'));
  const better = points >= 0;
  const amount = Math.abs(points).toFixed(1).replace('.', numberMarks(money.currency).decimal);
  return {
    label: t('dashboard.savingsDelta', `${better ? '+' : MINUS}${amount}`),
    tone: better ? 'good' : 'bad',
    direction: better ? 'up' : 'down',
  };
}

/** Spending more than usual reads as bad, whatever the amount. */
function directionOfSpending(kind: 'above' | 'below'): Pick<TileDelta, 'tone' | 'direction'> {
  return kind === 'above' ? { tone: 'bad', direction: 'up' } : { tone: 'good', direction: 'down' };
}

function netSpendDelta(comparison: AverageComparison, { t, money }: Words): TileDelta {
  if (comparison.kind === 'none') return neutral(t('dashboard.noAverage'));
  if (comparison.kind === 'near') return neutral(t('dashboard.nearAverage12'));
  const percent = money.formatPercent(comparison.ratio, 0);
  return {
    label:
      comparison.kind === 'above'
        ? t('dashboard.aboveAverage12', percent)
        : t('dashboard.belowAverage12', percent),
    ...directionOfSpending(comparison.kind),
  };
}

function legendDelta(comparison: AverageComparison, { t, money }: Words): TileDelta {
  if (comparison.kind === 'none') return neutral(t('dashboard.noHistory'));
  if (comparison.kind === 'near') return neutral(t('dashboard.onAverage'));
  return {
    label: t('dashboard.vsAverage', money.formatPercent(comparison.ratio, 0)),
    ...directionOfSpending(comparison.kind),
  };
}

function tilesOf({ kpis, month, partnerName }: Dashboard, words: Words): TileSpec[] {
  const { t, money } = words;
  const { balance, savingsRate, netSpend, yearToDate } = kpis;
  const hasYear = yearToDate.activeMonths > 0;
  return [
    {
      label: t('dashboard.balanceLabel'),
      hint: t('dashboard.balanceHint'),
      value: balance.hasData ? money.format(balance.cents) : NO_VALUE,
      negative: balance.cents < 0,
      delta: balanceDelta(balance, words),
    },
    {
      label: t('dashboard.savingsLabel'),
      hint: t('dashboard.savingsHint'),
      value: savingsRate.rate === null ? NO_VALUE : money.formatPercent(savingsRate.rate),
      negative: savingsRate.rate !== null && savingsRate.rate < 0,
      delta: savingsDelta(savingsRate.differencePoints, words),
    },
    {
      label: t('dashboard.netSpendLabel'),
      hint: t('dashboard.netSpendHint', partnerName),
      value: netSpend.cents === null ? NO_VALUE : money.format(netSpend.cents),
      delta: netSpendDelta(netSpend.comparison, words),
    },
    {
      label: t('dashboard.yearLabel'),
      hint: hasYear
        ? t('dashboard.yearHint', monthName(month, t), month.slice(0, 4))
        : t('dashboard.yearEmpty'),
      value: hasYear ? money.format(yearToDate.cents) : NO_VALUE,
      negative: yearToDate.cents < 0,
      delta: neutral(hasYear ? t('dashboard.yearAverage', money.format(yearToDate.averageCents)) : ''),
    },
  ];
}

function chartOf(
  series: DashboardMonth[],
  { t, money, language }: Localization,
): DashboardViewModel['chart'] {
  const { ticks, topCents } = niceAxis(
    Math.max(...series.map((m) => Math.max(m.incomeCents, m.expenseCents))),
  );
  const height = (cents: number) =>
    cents > 0 ? `max(2px, ${((cents / topCents) * 100).toFixed(2)}%)` : '0px';

  return {
    ticks: ticks.map((cents) => ({
      label: formatCompactAmount(cents, language),
      top: `${(100 - (cents / topCents) * 100).toFixed(2)}%`,
      isZero: cents === 0,
    })),
    groups: series.map((m, index) => ({
      month: m.month,
      label: monthAxisLabel(m.month, index, t),
      current: index === series.length - 1,
      incomeHeight: height(m.incomeCents),
      expenseHeight: height(m.expenseCents),
      tooltipAlign: tooltipAlignOf(index, series.length),
      title: monthLabel(m.month, t),
      hasData: m.hasData,
      income: money.format(m.incomeCents),
      expense: money.format(m.expenseCents),
      settlement: money.format(m.settlementCents),
      balance: money.format(m.balanceCents),
      ariaLabel: t(
        'dashboard.monthAria',
        monthLabel(m.month, t),
        money.format(m.incomeCents),
        money.format(m.expenseCents),
        money.format(m.settlementCents),
        money.format(m.balanceCents),
      ),
    })),
  };
}

function segmentRank({ id, color }: CategorySlice): number {
  if (id === OTHERS_SLICE_ID) return OTHERS_RANK;
  const index = (CATEGORY_PALETTE as readonly string[]).indexOf(color);
  return index === -1 ? UNKNOWN_COLOR_RANK : index;
}

/** Segments follow the palette, whose order keeps neighbors distinct, and not the ranking. */
function segmentsOf(slices: CategorySlice[]): DonutSegment[] {
  const gap = slices.length > 1 ? DONUT_SEGMENT_GAP : 0;
  let cursor = 0;
  return [...slices]
    .sort((a, b) => segmentRank(a) - segmentRank(b) || b.valueCents - a.valueCents)
    .map((slice) => {
      const length = slice.share * DONUT_CIRCUMFERENCE;
      const segment = {
        id: slice.id,
        color: slice.color,
        dash: `${Math.max(0.01, length - gap).toFixed(2)} ${DONUT_CIRCUMFERENCE.toFixed(2)}`,
        // Negating a zero cursor would print "-0.00".
        offset: (cursor === 0 ? 0 : -cursor).toFixed(2),
      };
      cursor += length;
      return segment;
    });
}

function donutOf({ slices, totalCents, count }: CategoryBreakdown, words: Words): DonutViewModel | null {
  const { t, money } = words;
  if (totalCents === 0) return null;
  return {
    segments: segmentsOf(slices),
    legend: slices.map((slice) => ({
      id: slice.id,
      name: slice.name,
      color: slice.color,
      value: money.format(slice.valueCents),
      percent: money.formatPercent(slice.share, 0),
      delta: legendDelta(slice.comparison, words),
      center: {
        title: slice.name,
        value: money.format(slice.valueCents),
        sub: t('dashboard.donutShare', money.formatPercent(slice.share)),
      },
    })),
    center: {
      title: t('dashboard.donutTotal'),
      value: money.format(totalCents),
      sub: t('dashboard.entryCount', count),
    },
    ariaLabel: t(
      'dashboard.donutAria',
      slices.map((s) => `${s.name} ${money.formatPercent(s.share, 0)}`).join(', '),
    ),
  };
}

function openOf(
  { items, count, outflowCents, inflowCents }: OpenItems,
  month: MonthKey,
  today: IsoDate,
  { t, money }: Words,
) {
  const hidden = count - items.length;
  return {
    summary: count ? t('dashboard.openCount', count) : t('dashboard.openAllConfirmed'),
    outflow: money.format(outflowCents),
    inflow: money.format(inflowCents),
    rows: items.map((item): OpenRow => {
      const meta = TYPE_META[item.type];
      const { dd, mm } = dateParts(item.date, t);
      const due = relativeDue(item.date, today, t);
      const typeLabel = t(`dashboard.type.${item.type}`);
      return {
        id: item.id,
        description: item.description,
        day: `${dd}/${mm}`,
        when: due.label,
        whenTone: due.tone,
        meta: item.categoryName ? `${typeLabel} · ${item.categoryName}` : typeLabel,
        value: `${meta.sign} ${money.format(item.valueCents)}`,
        valueClass: meta.text,
        confirmLabel: t('dashboard.confirmEntry', item.description),
      };
    }),
    more:
      hidden > 0
        ? {
            label: t('dashboard.openMore', hidden),
            href: `/lancamentos?mes=${month}&status=pending`,
          }
        : null,
  };
}

const SETTLEMENT_STATUS = {
  none: { label: 'dashboard.settlementNone', tone: 'none' },
  settled: { label: 'dashboard.settlementSettled', tone: 'settled' },
  partial: { label: 'dashboard.settlementPartial', tone: 'open' },
  pending: { label: 'dashboard.settlementPending', tone: 'open' },
} as const satisfies Record<SettlementCardStatus, { label: MessageKey; tone: SettlementTone }>;

function settlementOf(card: SettlementCard, { t, money }: Words): SettlementViewModel {
  const { label, tone } = SETTLEMENT_STATUS[card.status];
  const bills = t('dashboard.settlementBills', card.itemCount);
  return {
    status: t(label),
    statusTone: tone,
    pending: money.format(card.pendingCents),
    expected: money.format(card.expectedCents),
    progress: `${(card.progress * 100).toFixed(1)}%`,
    progressAria: t('dashboard.settlementProgressAria', money.formatPercent(card.progress, 0)),
    detail: t(
      'dashboard.settlementDetail',
      money.format(card.receivedCents),
      bills,
      money.format(card.totalCents),
    ),
  };
}

/** Display data for Visão geral, labeled as in the design. */
export function dashboardViewModel(
  dashboard: Dashboard,
  today: IsoDate,
  l10n: Localization,
): DashboardViewModel {
  const { month, mode, series, categories, open, settlement } = dashboard;
  const year = month.slice(0, 4);
  return {
    tiles: tilesOf(dashboard, l10n),
    chart: chartOf(series, l10n),
    donut: donutOf(categories, l10n),
    open: openOf(open, month, today, l10n),
    settlement: settlementOf(settlement, l10n),
    tableHref: mode === 'proj' ? `/resumo?ano=${year}&modo=proj` : `/resumo?ano=${year}`,
  };
}
