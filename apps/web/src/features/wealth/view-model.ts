import {
  allocationSegments,
  dateParts,
  elapsedLabel,
  formatCompactAmount,
  groupAssets,
  institutionsOf,
  MINUS,
  monthLabel,
  monthName,
  quoteStatus,
  unavailableQuoteCount,
  assetClassLabel,
  BASIS_POINTS,
  type Asset,
  type AssetGroup,
  type Cents,
  type EvolutionPoint,
  type IsoDate,
  type Localization,
  type MonthKey,
  type ValuedAsset,
  type Wealth,
  type WealthGrouping,
  type WealthKpis,
} from '@livro-caixa/domain';
import { monthAxisLabel, tooltipAlignOf, type TooltipAlign } from '@/shared/lib/month-chart';
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
  pricingTag: { kind: 'updated' | 'unavailable' | 'manual'; label: string };
  /** Says how old the price of an unavailable quote is. */
  priceNote: string;
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
  hasUnavailableQuote: boolean;
  institutions: string[];
}

/** Unit shown next to the quantity of foreign-currency holdings. */
const FOREIGN_CURRENCY_UNIT = ' USD';

const neutral = (label: string): TileDelta => ({ label, tone: 'neutral', direction: null });

const toneOf = (cents: number): ValueTone => (cents > 0 ? 'good' : cents < 0 ? 'bad' : 'neutral');

const signedPercent = (ratio: number, { money }: Localization): string =>
  `${ratio < 0 ? MINUS : '+'}${money.formatPercent(Math.abs(ratio))}`;

const shareLabel = (share: number, { money }: Localization): string =>
  share > 0 && share < MINIMUM_SHOWN_SHARE
    ? `<${money.formatPercent(MINIMUM_SHOWN_SHARE)}`
    : money.formatPercent(share);

const signedOrDash = (cents: Cents | null, { money }: Localization): string =>
  cents === null ? NO_VALUE : money.formatSigned(cents);

function trend(cents: number, label: string): TileDelta {
  const up = cents >= 0;
  return { label, tone: up ? 'good' : 'bad', direction: up ? 'up' : 'down' };
}

function sinceLastClosingTile(
  kpis: WealthKpis,
  dayChangeCents: Cents,
  calm: boolean,
  l10n: Localization,
): TileSpec {
  const { t, money } = l10n;
  const since = kpis.sinceLastClosing;
  return {
    label: since ? t('wealth.sinceClosingOf', monthName(since.month, t)) : t('wealth.sinceClosing'),
    hint: t('wealth.sinceClosingHint'),
    value: since ? money.formatSigned(since.changeCents) : NO_VALUE,
    dark: true,
    valueTone: since && since.changeCents < 0 ? 'bad' : 'good',
    delta: neutral(
      calm ? t('wealth.calmNote') : t('wealth.todayByQuotes', money.formatSigned(dayChangeCents)),
    ),
  };
}

function lastClosingTile({ lastClosing }: WealthKpis, l10n: Localization): TileSpec {
  const { t, money } = l10n;
  if (!lastClosing) {
    return {
      label: t('wealth.lastClosing'),
      hint: t('wealth.noClosingHint'),
      value: NO_VALUE,
      delta: neutral(t('wealth.firstClosing')),
    };
  }
  const { month, totalCents, contributionsCents, yieldCents, changeCents, changeRatio } = lastClosing;
  const percent = changeRatio === null ? '' : ` (${signedPercent(changeRatio, l10n)})`;
  return {
    label: t('wealth.closingOf', monthName(month, t)),
    hint: t('wealth.contributionsYield', money.format(contributionsCents), signedOrDash(yieldCents, l10n)),
    value: money.format(totalCents),
    delta:
      changeCents === null
        ? neutral(t('wealth.firstClosing'))
        : trend(changeCents, t('wealth.changeInMonth', `${money.formatSigned(changeCents)}${percent}`)),
  };
}

function lastYearTile({ lastYear }: WealthKpis, l10n: Localization): TileSpec {
  const { t, money } = l10n;
  const label = t('wealth.lastYear');
  if (!lastYear) {
    return {
      label,
      hint: t('wealth.noClosingHint'),
      value: NO_VALUE,
      delta: neutral(t('wealth.firstClosing')),
    };
  }
  const { baseMonth, changeCents, contributionsCents, yieldCents, ratio } = lastYear;
  const since = t('wealth.sinceMonth', monthName(baseMonth, t), baseMonth.slice(2, 4));
  return {
    label,
    hint: t('wealth.contributionsYield', money.format(contributionsCents), money.formatSigned(yieldCents)),
    value: money.formatSigned(changeCents),
    valueTone: toneOf(changeCents),
    delta: trend(changeCents, ratio === null ? since : `${signedPercent(ratio, l10n)} ${since}`),
  };
}

function resultTile({ result }: WealthKpis, l10n: Localization): TileSpec {
  const { t, money } = l10n;
  return {
    label: t('wealth.result'),
    hint: t('wealth.resultHint', money.format(result.investedCents)),
    value: money.formatSigned(result.gainCents),
    valueTone: toneOf(result.gainCents),
    delta: trend(result.gainCents, t('wealth.returnOn', signedPercent(result.ratio, l10n))),
  };
}

function barOf(
  point: EvolutionPoint,
  index: number,
  count: number,
  topCents: Cents,
  l10n: Localization,
): EvolutionBar {
  const { t, money } = l10n;
  const { month, totalCents, partial, changeCents, contributionsCents, yieldCents } = point;
  const title = monthLabel(month, t);
  return {
    month,
    label: monthAxisLabel(month, index, t),
    partial,
    height: totalCents > 0 ? `max(2px, ${((totalCents / topCents) * 100).toFixed(2)}%)` : '0px',
    tooltipAlign: tooltipAlignOf(index, count),
    title: partial ? t('wealth.openMonthTitle', title) : title,
    total: money.format(totalCents),
    change: signedOrDash(changeCents, l10n),
    contributions: contributionsCents === null ? t('wealth.atClosing') : money.format(contributionsCents),
    yieldLabel: signedOrDash(yieldCents, l10n),
    ariaLabel: t('wealth.barAria', title, money.format(totalCents), partial),
  };
}

function chartOf({ points, axis }: Wealth['evolution'], l10n: Localization): WealthViewModel['chart'] {
  return {
    ticks: axis.ticks.map((cents) => ({
      label: formatCompactAmount(cents, l10n.language),
      top: `${(100 - (cents / axis.topCents) * 100).toFixed(2)}%`,
      isZero: cents === 0,
    })),
    bars: points.map((point, index) => barOf(point, index, points.length, axis.topCents, l10n)),
  };
}

function allocationOf(groups: AssetGroup[], l10n: Localization): AllocationView {
  const { t, money } = l10n;
  return {
    ariaLabel: t(
      'wealth.distributionAria',
      groups.map((g) => `${g.name} ${shareLabel(g.share, l10n)}`).join(', '),
    ),
    segments: allocationSegments(groups).map((g) => ({ key: g.key, color: g.color, grow: g.valueCents })),
    legend: groups.map((g) => ({
      key: g.key,
      name: g.name,
      color: g.color,
      value: money.format(g.valueCents),
      percent: shareLabel(g.share, l10n),
    })),
  };
}

function dayAndMonth(date: IsoDate, { t }: Pick<Localization, 't'>): string {
  const { dd, mm } = dateParts(date, t);
  return `${dd}/${mm}`;
}

export function pricingOf(
  asset: Asset,
  now: number,
  l10n: Pick<Localization, 't'>,
): Pick<AssetRow, 'pricingTag' | 'priceNote'> {
  const { t } = l10n;
  if (asset.pricing !== 'auto') {
    return {
      pricingTag: { kind: 'manual', label: t('wealth.tagManual', dayAndMonth(asset.updatedAt, l10n)) },
      priceNote: '',
    };
  }
  const status = quoteStatus(asset);
  if (status.kind === 'updated') {
    return {
      pricingTag: { kind: 'updated', label: t('wealth.tagUpdated', elapsedLabel(status.quotedAt, now, t)) },
      priceNote: '',
    };
  }
  return {
    pricingTag: { kind: 'unavailable', label: t('wealth.tagUnavailable') },
    priceNote:
      status.quotedAt === null
        ? t('wealth.since', dayAndMonth(asset.updatedAt, l10n))
        : elapsedLabel(status.quotedAt, now, t),
  };
}

function quantityOf(asset: ValuedAsset, { money }: Localization): string {
  if (asset.pricing !== 'auto') return NO_VALUE;
  const unit = asset.assetClass === 'cambio' ? FOREIGN_CURRENCY_UNIT : '';
  return `${money.formatQuantity(asset.quantityE8)}${unit}`;
}

function dayOf(asset: ValuedAsset, l10n: Localization): Pick<AssetRow, 'day' | 'dayTone'> {
  if (asset.pricing !== 'auto' || asset.dayChangeBps === null) return { day: NO_VALUE, dayTone: 'neutral' };
  return {
    day: signedPercent(asset.dayChangeBps / BASIS_POINTS, l10n),
    dayTone: toneOf(asset.dayChangeBps),
  };
}

function rowOf(asset: ValuedAsset, grouping: WealthGrouping, now: number, l10n: Localization): AssetRow {
  const { t, money } = l10n;
  const isAuto = asset.pricing === 'auto';
  const { costCents, resultCents } = asset;
  return {
    asset,
    id: asset.id,
    name: asset.name,
    subtitle: grouping === 'class' ? asset.institution : assetClassLabel(asset.assetClass, t),
    ...pricingOf(asset, now, l10n),
    quantity: quantityOf(asset, l10n),
    avgPrice: isAuto && asset.avgPriceCents !== null ? money.format(asset.avgPriceCents) : NO_VALUE,
    price: isAuto ? money.format(asset.priceCents) : NO_VALUE,
    invested: costCents === null ? NO_VALUE : money.format(costCents),
    current: money.format(asset.valueCents),
    result: signedOrDash(resultCents, l10n),
    resultPercent: resultCents === null || !costCents ? '' : signedPercent(resultCents / costCents, l10n),
    resultTone: resultCents === null ? 'neutral' : toneOf(resultCents),
    share: shareLabel(asset.share, l10n),
    shareWidth: `${(asset.share * 100).toFixed(1)}%`,
    ...dayOf(asset, l10n),
  };
}

function groupOf(
  group: AssetGroup,
  grouping: WealthGrouping,
  now: number,
  l10n: Localization,
): AssetGroupView {
  return {
    key: group.key,
    name: group.name,
    color: group.color,
    count: l10n.t('wealth.assetCount', group.assets.length),
    value: l10n.money.format(group.valueCents),
    percent: shareLabel(group.share, l10n),
    rows: group.assets.map((asset) => rowOf(asset, grouping, now, l10n)),
  };
}

export function wealthViewModel(
  wealth: Wealth,
  grouping: WealthGrouping,
  calm: boolean,
  now: number,
  l10n: Localization,
): WealthViewModel {
  const { t, money } = l10n;
  const groups = groupAssets(wealth.assets, grouping, t);
  const institutions = institutionsOf(wealth.assets);
  const { kpis } = wealth;
  return {
    total: money.format(wealth.totalCents),
    assetCount: t(
      'wealth.assetsIn',
      t('wealth.assetCount', wealth.assets.length),
      t('wealth.institutionCount', institutions.length),
    ),
    invested: money.format(wealth.investedCents),
    tiles: [
      sinceLastClosingTile(kpis, wealth.dayChangeCents, calm, l10n),
      lastClosingTile(kpis, l10n),
      lastYearTile(kpis, l10n),
      resultTile(kpis, l10n),
    ],
    chart: chartOf(wealth.evolution, l10n),
    allocation: allocationOf(groups, l10n),
    groups: groups.map((group) => groupOf(group, grouping, now, l10n)),
    hasUnavailableQuote: unavailableQuoteCount(wealth.assets) > 0,
    institutions,
  };
}
