import {
  CATEGORY_PALETTE,
  dateParts,
  formatCompactAmount,
  formatMoney,
  formatPercent,
  MINUS,
  monthLabel,
  monthName,
  monthShortName,
  niceAxis,
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
  type MonthKey,
  type OpenItems,
  type SettlementCard,
  type SettlementCardStatus,
} from '@livro-caixa/domain';
import { TYPE_META } from '@/features/transactions/view-model';
import { pluralize } from '@/shared/lib/utils';
import type { TileDelta, TileSpec } from '@/shared/SummaryTiles';

const NO_VALUE = '—';
const JANUARY = '01';
const TOOLTIP_EDGE_MONTHS = 2;

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
  tooltipAlign: 'start' | 'center' | 'end';
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

const neutral = (label: string): TileDelta => ({ label, tone: 'neutral', direction: null });

function balanceDelta({
  hasData,
  previousHasData,
  previousMonth,
  differenceCents,
}: DashboardKpis['balance']) {
  if (!hasData) return neutral('Sem lançamentos no mês');
  if (!previousHasData) return neutral(`Sem dados de ${monthName(previousMonth)}`);
  const better = differenceCents >= 0;
  return {
    label: `${formatMoney(Math.abs(differenceCents))} ${better ? 'a mais' : 'a menos'} que ${monthName(previousMonth)}`,
    tone: better ? 'good' : 'bad',
    direction: better ? 'up' : 'down',
  } satisfies TileDelta;
}

function savingsDelta(points: number | null): TileDelta {
  if (points === null) return neutral('Sem média para comparar');
  const better = points >= 0;
  const amount = Math.abs(points).toFixed(1).replace('.', ',');
  return {
    label: `${better ? '+' : MINUS}${amount} p.p. vs média de 12 meses`,
    tone: better ? 'good' : 'bad',
    direction: better ? 'up' : 'down',
  };
}

/** Spending more than usual reads as bad, whatever the amount. */
function directionOfSpending(kind: 'above' | 'below'): Pick<TileDelta, 'tone' | 'direction'> {
  return kind === 'above' ? { tone: 'bad', direction: 'up' } : { tone: 'good', direction: 'down' };
}

function netSpendDelta(comparison: AverageComparison): TileDelta {
  if (comparison.kind === 'none') return neutral('Sem média para comparar');
  if (comparison.kind === 'near') return neutral('Na média dos últimos 12 meses');
  const side = comparison.kind === 'above' ? 'acima' : 'abaixo';
  return {
    label: `${formatPercent(comparison.ratio, 0)} ${side} da média de 12 meses`,
    ...directionOfSpending(comparison.kind),
  };
}

function legendDelta(comparison: AverageComparison): TileDelta {
  if (comparison.kind === 'none') return neutral('Sem histórico');
  if (comparison.kind === 'near') return neutral('Na média');
  return { label: `${formatPercent(comparison.ratio, 0)} vs média`, ...directionOfSpending(comparison.kind) };
}

function tilesOf({ kpis, month, partnerName }: Dashboard): TileSpec[] {
  const { balance, savingsRate, netSpend, yearToDate } = kpis;
  const hasYear = yearToDate.activeMonths > 0;
  return [
    {
      label: 'Balanço do mês',
      hint: 'Receitas + acertos − despesas',
      value: balance.hasData ? formatMoney(balance.cents) : NO_VALUE,
      negative: balance.cents < 0,
      delta: balanceDelta(balance),
    },
    {
      label: 'Taxa de poupança',
      hint: 'Parte da receita que sobrou',
      value: savingsRate.rate === null ? NO_VALUE : formatPercent(savingsRate.rate),
      negative: savingsRate.rate !== null && savingsRate.rate < 0,
      delta: savingsDelta(savingsRate.differencePoints),
    },
    {
      label: 'Gasto líquido',
      hint: `Despesas menos o acerto de ${partnerName}`,
      value: netSpend.cents === null ? NO_VALUE : formatMoney(netSpend.cents),
      delta: netSpendDelta(netSpend.comparison),
    },
    {
      label: 'Acumulado no ano',
      hint: hasYear
        ? `Janeiro a ${monthName(month)} de ${month.slice(0, 4)}`
        : 'Ainda sem lançamentos no ano',
      value: hasYear ? formatMoney(yearToDate.cents) : NO_VALUE,
      negative: yearToDate.cents < 0,
      delta: neutral(hasYear ? `Média de ${formatMoney(yearToDate.averageCents)} por mês` : ''),
    },
  ];
}

function tooltipAlignOf(index: number, count: number): ChartGroup['tooltipAlign'] {
  if (index < TOOLTIP_EDGE_MONTHS) return 'start';
  return index >= count - TOOLTIP_EDGE_MONTHS ? 'end' : 'center';
}

function monthAxisLabel(month: MonthKey, index: number): string {
  const showYear = index === 0 || month.slice(5) === JANUARY;
  return showYear ? `${monthShortName(month)} ’${month.slice(2, 4)}` : monthShortName(month);
}

function chartOf(series: DashboardMonth[]): DashboardViewModel['chart'] {
  const { ticks, topCents } = niceAxis(
    Math.max(...series.map((m) => Math.max(m.incomeCents, m.expenseCents))),
  );
  const height = (cents: number) =>
    cents > 0 ? `max(2px, ${((cents / topCents) * 100).toFixed(2)}%)` : '0px';

  return {
    ticks: ticks.map((cents) => ({
      label: formatCompactAmount(cents),
      top: `${(100 - (cents / topCents) * 100).toFixed(2)}%`,
      isZero: cents === 0,
    })),
    groups: series.map((m, index) => ({
      month: m.month,
      label: monthAxisLabel(m.month, index),
      current: index === series.length - 1,
      incomeHeight: height(m.incomeCents),
      expenseHeight: height(m.expenseCents),
      tooltipAlign: tooltipAlignOf(index, series.length),
      title: monthLabel(m.month),
      hasData: m.hasData,
      income: formatMoney(m.incomeCents),
      expense: formatMoney(m.expenseCents),
      settlement: formatMoney(m.settlementCents),
      balance: formatMoney(m.balanceCents),
      ariaLabel: `${monthLabel(m.month)}: receitas ${formatMoney(m.incomeCents)}, despesas ${formatMoney(m.expenseCents)}`,
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

function donutOf({ slices, totalCents, count }: CategoryBreakdown): DonutViewModel | null {
  if (totalCents === 0) return null;
  return {
    segments: segmentsOf(slices),
    legend: slices.map((slice) => ({
      id: slice.id,
      name: slice.name,
      color: slice.color,
      value: formatMoney(slice.valueCents),
      percent: formatPercent(slice.share, 0),
      delta: legendDelta(slice.comparison),
      center: {
        title: slice.name,
        value: formatMoney(slice.valueCents),
        sub: `${formatPercent(slice.share)} das despesas`,
      },
    })),
    center: {
      title: 'Total de despesas',
      value: formatMoney(totalCents),
      sub: pluralize(count, 'lançamento', 'lançamentos'),
    },
    ariaLabel: `Despesas por categoria: ${slices.map((s) => `${s.name} ${formatPercent(s.share, 0)}`).join(', ')}`,
  };
}

function openOf({ items, count, outflowCents, inflowCents }: OpenItems, month: MonthKey, today: IsoDate) {
  const hidden = count - items.length;
  return {
    summary: count ? pluralize(count, 'lançamento previsto', 'lançamentos previstos') : 'Tudo confirmado',
    outflow: formatMoney(outflowCents),
    inflow: formatMoney(inflowCents),
    rows: items.map((item): OpenRow => {
      const meta = TYPE_META[item.type];
      const { dd, mm } = dateParts(item.date);
      const due = relativeDue(item.date, today);
      return {
        id: item.id,
        description: item.description,
        day: `${dd}/${mm}`,
        when: due.label,
        whenTone: due.tone,
        meta: item.categoryName ? `${meta.label} · ${item.categoryName}` : meta.label,
        value: `${meta.sign} ${formatMoney(item.valueCents)}`,
        valueClass: meta.text,
        confirmLabel: `Confirmar ${item.description}`,
      };
    }),
    more:
      hidden > 0
        ? {
            label: `Ver mais ${pluralize(hidden, 'previsto', 'previstos')}`,
            href: `/lancamentos?mes=${month}&status=pending`,
          }
        : null,
  };
}

const SETTLEMENT_STATUS: Record<SettlementCardStatus, { label: string; tone: SettlementTone }> = {
  none: { label: 'Sem contas divididas', tone: 'none' },
  settled: { label: 'Quitado', tone: 'settled' },
  partial: { label: 'Parcial', tone: 'open' },
  pending: { label: 'Pendente', tone: 'open' },
};

function settlementOf(card: SettlementCard): SettlementViewModel {
  const { label, tone } = SETTLEMENT_STATUS[card.status];
  const bills = pluralize(card.itemCount, 'conta dividida', 'contas divididas');
  return {
    status: label,
    statusTone: tone,
    pending: formatMoney(card.pendingCents),
    expected: formatMoney(card.expectedCents),
    progress: `${(card.progress * 100).toFixed(1)}%`,
    progressAria: `Recebido ${formatPercent(card.progress, 0)} do acerto`,
    detail: `${formatMoney(card.receivedCents)} recebido · ${bills} (${formatMoney(card.totalCents)})`,
  };
}

/** Display data for Visão geral, labeled as in the design. */
export function dashboardViewModel(dashboard: Dashboard, today: IsoDate): DashboardViewModel {
  const { month, mode, series, categories, open, settlement } = dashboard;
  const year = month.slice(0, 4);
  return {
    tiles: tilesOf(dashboard),
    chart: chartOf(series),
    donut: donutOf(categories),
    open: openOf(open, month, today),
    settlement: settlementOf(settlement),
    tableHref: mode === 'proj' ? `/resumo?ano=${year}&modo=proj` : `/resumo?ano=${year}`,
  };
}
