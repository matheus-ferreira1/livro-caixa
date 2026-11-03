import {
  allocationSegments,
  dateParts,
  formatCompactAmount,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatSignedMoney,
  groupAssets,
  institutionsOf,
  MINUS,
  monthLabel,
  monthName,
  assetClassLabel,
  BASIS_POINTS,
  type AssetGroup,
  type Cents,
  type EvolutionPoint,
  type MonthKey,
  type ValuedAsset,
  type Wealth,
  type WealthGrouping,
  type WealthKpis,
} from '@livro-caixa/domain';
import { monthAxisLabel, tooltipAlignOf, type TooltipAlign } from '@/shared/lib/month-chart';
import { pluralize } from '@/shared/lib/utils';
import type { TileDelta, TileSpec } from '@/shared/SummaryTiles';

const NO_VALUE = '—';
/** Below this a share would round to "0%", which reads as nothing at all. */
const MINIMUM_SHOWN_SHARE = 0.001;

export type ValueTone = 'good' | 'bad' | 'neutral';

export interface EvolutionTick {
  label: string;
  top: string;
  isZero: boolean;
}

export interface EvolutionBar {
  month: MonthKey;
  label: string;
  partial: boolean;
  height: string;
  tooltipAlign: TooltipAlign;
  title: string;
  total: string;
  change: string;
  contributions: string;
  yieldLabel: string;
  ariaLabel: string;
}

export interface AssetRow {
  asset: ValuedAsset;
  id: string;
  name: string;
  subtitle: string;
  isAuto: boolean;
  pricingLabel: string;
  quantity: string;
  avgPrice: string;
  price: string;
  invested: string;
  current: string;
  result: string;
  resultPercent: string;
  resultTone: ValueTone;
  share: string;
  shareWidth: string;
  day: string;
  dayTone: ValueTone;
}

export interface AssetGroupView {
  key: string;
  name: string;
  color: string;
  count: string;
  value: string;
  percent: string;
  rows: AssetRow[];
}

export interface AllocationView {
  ariaLabel: string;
  segments: { key: string; color: string; grow: number }[];
  legend: { key: string; name: string; color: string; value: string; percent: string }[];
}

export interface WealthViewModel {
  total: string;
  assetCount: string;
  invested: string;
  tiles: TileSpec[];
  chart: { ticks: EvolutionTick[]; bars: EvolutionBar[] };
  allocation: AllocationView;
  groups: AssetGroupView[];
  institutions: string[];
}

const neutral = (label: string): TileDelta => ({ label, tone: 'neutral', direction: null });

const toneOf = (cents: number): ValueTone => (cents > 0 ? 'good' : cents < 0 ? 'bad' : 'neutral');

const signedPercent = (ratio: number): string =>
  `${ratio < 0 ? MINUS : '+'}${formatPercent(Math.abs(ratio))}`;

const shareLabel = (share: number): string =>
  share > 0 && share < MINIMUM_SHOWN_SHARE ? '<0,1%' : formatPercent(share);

const signedOrDash = (cents: Cents | null): string => (cents === null ? NO_VALUE : formatSignedMoney(cents));

function trend(cents: number, label: string): TileDelta {
  const up = cents >= 0;
  return { label, tone: up ? 'good' : 'bad', direction: up ? 'up' : 'down' };
}

function sinceLastClosingTile(kpis: WealthKpis, dayChangeCents: Cents, calm: boolean): TileSpec {
  const since = kpis.sinceLastClosing;
  return {
    label: since ? `Desde o fechamento de ${monthName(since.month)}` : 'Desde o fechamento',
    hint: 'Patrimônio de hoje vs último fechamento',
    value: since ? formatSignedMoney(since.changeCents) : NO_VALUE,
    dark: true,
    valueTone: since && since.changeCents < 0 ? 'bad' : 'good',
    delta: neutral(
      calm
        ? 'Aportes e rendimento aparecem no fechamento'
        : `Hoje, pelas cotações: ${formatSignedMoney(dayChangeCents)}`,
    ),
  };
}

function lastClosingTile({ lastClosing }: WealthKpis): TileSpec {
  if (!lastClosing) {
    return {
      label: 'Último fechamento',
      hint: 'Nenhum fechamento registrado',
      value: NO_VALUE,
      delta: neutral('Primeiro fechamento'),
    };
  }
  const { month, totalCents, contributionsCents, yieldCents, changeCents, changeRatio } = lastClosing;
  const percent = changeRatio === null ? '' : ` (${signedPercent(changeRatio)})`;
  return {
    label: `Fechamento de ${monthName(month)}`,
    hint: `Aportes ${formatMoney(contributionsCents)} · rendimento ${signedOrDash(yieldCents)}`,
    value: formatMoney(totalCents),
    delta:
      changeCents === null
        ? neutral('Primeiro fechamento')
        : trend(changeCents, `${formatSignedMoney(changeCents)}${percent} no mês`),
  };
}

function lastYearTile({ lastYear }: WealthKpis): TileSpec {
  const label = 'Últimos 12 meses';
  if (!lastYear) {
    return {
      label,
      hint: 'Nenhum fechamento registrado',
      value: NO_VALUE,
      delta: neutral('Primeiro fechamento'),
    };
  }
  const { baseMonth, changeCents, contributionsCents, yieldCents, ratio } = lastYear;
  const since = `desde ${monthName(baseMonth)}/${baseMonth.slice(2, 4)}`;
  return {
    label,
    hint: `Aportes ${formatMoney(contributionsCents)} · rendimento ${formatSignedMoney(yieldCents)}`,
    value: formatSignedMoney(changeCents),
    valueTone: toneOf(changeCents),
    delta: trend(changeCents, ratio === null ? since : `${signedPercent(ratio)} ${since}`),
  };
}

function resultTile({ result }: WealthKpis): TileSpec {
  return {
    label: 'Resultado da carteira',
    hint: `Sobre ${formatMoney(result.investedCents)} aplicados`,
    value: formatSignedMoney(result.gainCents),
    valueTone: toneOf(result.gainCents),
    delta: trend(result.gainCents, `${signedPercent(result.ratio)} de rentabilidade`),
  };
}

function barOf(point: EvolutionPoint, index: number, count: number, topCents: Cents): EvolutionBar {
  const { month, totalCents, partial, changeCents, contributionsCents, yieldCents } = point;
  const title = monthLabel(month);
  return {
    month,
    label: monthAxisLabel(month, index),
    partial,
    height: totalCents > 0 ? `max(2px, ${((totalCents / topCents) * 100).toFixed(2)}%)` : '0px',
    tooltipAlign: tooltipAlignOf(index, count),
    title: partial ? `${title} · em aberto` : title,
    total: formatMoney(totalCents),
    change: signedOrDash(changeCents),
    contributions: contributionsCents === null ? 'no fechamento' : formatMoney(contributionsCents),
    yieldLabel: signedOrDash(yieldCents),
    ariaLabel: `${title}: ${formatMoney(totalCents)}${partial ? ', mês em aberto' : ''}`,
  };
}

function chartOf({ points, axis }: Wealth['evolution']): WealthViewModel['chart'] {
  return {
    ticks: axis.ticks.map((cents) => ({
      label: formatCompactAmount(cents),
      top: `${(100 - (cents / axis.topCents) * 100).toFixed(2)}%`,
      isZero: cents === 0,
    })),
    bars: points.map((point, index) => barOf(point, index, points.length, axis.topCents)),
  };
}

function allocationOf(groups: AssetGroup[]): AllocationView {
  return {
    ariaLabel: `Distribuição: ${groups.map((g) => `${g.name} ${shareLabel(g.share)}`).join(', ')}`,
    segments: allocationSegments(groups).map((g) => ({ key: g.key, color: g.color, grow: g.valueCents })),
    legend: groups.map((g) => ({
      key: g.key,
      name: g.name,
      color: g.color,
      value: formatMoney(g.valueCents),
      percent: shareLabel(g.share),
    })),
  };
}

function pricingLabelOf(asset: ValuedAsset): string {
  if (asset.pricing === 'auto') return 'Cotação automática';
  const { dd, mm } = dateParts(asset.updatedAt);
  return `Manual · ${dd}/${mm}`;
}

function quantityOf(asset: ValuedAsset): string {
  if (asset.pricing !== 'auto') return NO_VALUE;
  const unit = asset.assetClass === 'cambio' ? ' USD' : '';
  return `${formatQuantity(asset.quantityE8)}${unit}`;
}

function dayOf(asset: ValuedAsset): Pick<AssetRow, 'day' | 'dayTone'> {
  if (asset.pricing !== 'auto' || asset.dayChangeBps === null) return { day: NO_VALUE, dayTone: 'neutral' };
  return {
    day: signedPercent(asset.dayChangeBps / BASIS_POINTS),
    dayTone: toneOf(asset.dayChangeBps),
  };
}

function rowOf(asset: ValuedAsset, grouping: WealthGrouping): AssetRow {
  const isAuto = asset.pricing === 'auto';
  const { costCents, resultCents } = asset;
  return {
    asset,
    id: asset.id,
    name: asset.name,
    subtitle: grouping === 'class' ? asset.institution : assetClassLabel(asset.assetClass),
    isAuto,
    pricingLabel: pricingLabelOf(asset),
    quantity: quantityOf(asset),
    avgPrice: isAuto && asset.avgPriceCents !== null ? formatMoney(asset.avgPriceCents) : NO_VALUE,
    price: isAuto ? formatMoney(asset.priceCents) : NO_VALUE,
    invested: costCents === null ? NO_VALUE : formatMoney(costCents),
    current: formatMoney(asset.valueCents),
    result: signedOrDash(resultCents),
    resultPercent: resultCents === null || !costCents ? '' : signedPercent(resultCents / costCents),
    resultTone: resultCents === null ? 'neutral' : toneOf(resultCents),
    share: shareLabel(asset.share),
    shareWidth: `${(asset.share * 100).toFixed(1)}%`,
    ...dayOf(asset),
  };
}

function groupOf(group: AssetGroup, grouping: WealthGrouping): AssetGroupView {
  return {
    key: group.key,
    name: group.name,
    color: group.color,
    count: pluralize(group.assets.length, 'ativo', 'ativos'),
    value: formatMoney(group.valueCents),
    percent: shareLabel(group.share),
    rows: group.assets.map((asset) => rowOf(asset, grouping)),
  };
}

export function wealthViewModel(wealth: Wealth, grouping: WealthGrouping, calm: boolean): WealthViewModel {
  const groups = groupAssets(wealth.assets, grouping);
  const institutions = institutionsOf(wealth.assets);
  const { kpis } = wealth;
  return {
    total: formatMoney(wealth.totalCents),
    assetCount: `${pluralize(wealth.assets.length, 'ativo', 'ativos')} em ${pluralize(institutions.length, 'instituição', 'instituições')}`,
    invested: formatMoney(wealth.investedCents),
    tiles: [
      sinceLastClosingTile(kpis, wealth.dayChangeCents, calm),
      lastClosingTile(kpis),
      lastYearTile(kpis),
      resultTile(kpis),
    ],
    chart: chartOf(wealth.evolution),
    allocation: allocationOf(groups),
    groups: groups.map((group) => groupOf(group, grouping)),
    institutions,
  };
}
