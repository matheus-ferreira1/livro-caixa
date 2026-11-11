import {
  assetValue,
  assetClassLabel,
  CLOSING_OPEN_DAY,
  closingDraft,
  dateParts,
  monthLabel,
  monthName,
  unavailableQuoteCount,
  type Asset,
  type ClosingEdits,
  type Localization,
  type Translate,
  type MonthKey,
  type Wealth,
} from '@livro-caixa/domain';
import { pricingOf, type AssetRow } from './view-model';

const NO_VALUE = '—';

type LastClosing = { month: MonthKey; totalCents: number };

export type ClosingBanner =
  { kind: 'open'; title: string; detail: string } | { kind: 'waiting'; label: string } | null;

export interface ClosingRowView {
  id: string;
  name: string;
  subtitle: string;
  last: string;
  lastDate: string;
  flowInput: string;
  valueInput: string;
  flowLabel: string;
  valueLabel: string;
  flowValid: boolean;
  valueValid: boolean;
}

export interface ClosingView {
  subtitle: string;
  manualRows: ClosingRowView[];
  autoNote: string;
  autoRows: ({ id: string; name: string; subtitle: string; value: string } & Pick<
    AssetRow,
    'pricingTag' | 'priceNote'
  >)[];
  total: string;
  change: string;
  contributions: string;
  yieldLabel: string;
  changeCents: number | null;
  yieldCents: number | null;
  submitLabel: string;
}

function missingQuotes(count: number, t: Translate): string {
  return count === 1 ? t('wealth.closing.missingOne') : t('wealth.closing.missingMany', count);
}

function closingAutoNote(assets: Asset[], t: Translate): string {
  const missing = unavailableQuoteCount(assets);
  const trades = t('wealth.closing.autoTrades');
  return missing === 0
    ? t('wealth.closing.autoUpToDate', trades)
    : t('wealth.closing.autoStale', missingQuotes(missing, t), trades);
}

function closingBannerDetail(assets: Asset[], t: Translate): string {
  const missing = unavailableQuoteCount(assets);
  const review = t('wealth.closing.manualReview');
  return missing === 0
    ? t('wealth.closing.bannerUpToDate', review)
    : t('wealth.closing.bannerMissing', review, missingQuotes(missing, t));
}

export function closingBanner(wealth: Wealth, t: Translate): ClosingBanner {
  const open = wealth.openMonth;
  if (wealth.closingAvailable) {
    return {
      kind: 'open',
      title: t('wealth.closing.available', monthLabel(open, t)),
      detail: closingBannerDetail(wealth.assets, t),
    };
  }
  const last = wealth.kpis.lastClosing;
  if (!last) return null;
  return {
    kind: 'waiting',
    label: t(
      'wealth.closing.waiting',
      monthLabel(last.month, t),
      monthName(open, t),
      CLOSING_OPEN_DAY,
      open.slice(5),
    ),
  };
}

function differenceOf(totalCents: number, contributionsCents: number, previousCents: number | null) {
  if (previousCents === null) return { changeCents: null, yieldCents: null };
  const changeCents = totalCents - previousCents;
  return { changeCents, yieldCents: changeCents - contributionsCents };
}

export const closingSubtitle = (last: LastClosing | null, { t, money }: Localization): string =>
  last
    ? t('wealth.closing.comparedTo', monthName(last.month, t), money.format(last.totalCents))
    : t('wealth.firstClosing');

export function closingView(
  assets: Asset[],
  edits: ClosingEdits,
  month: MonthKey,
  last: LastClosing | null,
  now: number,
  l10n: Localization,
): ClosingView {
  const { t, money } = l10n;
  const draft = closingDraft(assets, edits, money);
  const { changeCents, yieldCents } = differenceOf(
    draft.totalCents,
    draft.contributionsCents,
    last?.totalCents ?? null,
  );
  return {
    subtitle: closingSubtitle(last, l10n),
    manualRows: draft.rows.map(({ asset, flowInput, valueInput, flowCents, valueCents }) => {
      const { dd, mm } = dateParts(asset.updatedAt, t);
      return {
        id: asset.id,
        name: asset.name,
        subtitle: `${asset.institution} · ${assetClassLabel(asset.assetClass, t)}`,
        last: money.format(asset.currentCents),
        lastDate: t('wealth.since', `${dd}/${mm}`),
        flowInput,
        valueInput,
        flowLabel: t('wealth.closing.flowLabel', asset.name),
        valueLabel: t('wealth.closing.valueLabel', asset.name),
        flowValid: flowCents !== null,
        valueValid: valueCents !== null,
      };
    }),
    autoNote: closingAutoNote(assets, t),
    autoRows: draft.autoAssets.map((asset) => ({
      ...pricingOf(asset, now, l10n),
      id: asset.id,
      name: asset.name,
      subtitle: `${asset.institution} · ${money.formatQuantity(asset.quantityE8)} × ${money.format(asset.priceCents)}`,
      value: money.format(assetValue(asset)),
    })),
    total: money.format(draft.totalCents),
    change: changeCents === null ? NO_VALUE : money.formatSigned(changeCents),
    contributions: money.formatSigned(draft.contributionsCents),
    yieldLabel: yieldCents === null ? NO_VALUE : money.formatSigned(yieldCents),
    changeCents,
    yieldCents,
    submitLabel: t('wealth.closing.submit', monthName(month, t)),
  };
}
