import { z } from 'zod';
import { isIsoDate, isMonthKey, monthOf, shiftMonth, type IsoDate, type MonthKey } from '../dates/dates';
import type { Translate } from '../i18n/translate';
import { sumCents, type Cents, type MoneyFormat } from '../money/money';
import { assetValue, type Asset, type AutoAsset, type ManualAsset, type Snapshot } from './asset';

/** A closing opens on this day of its month, once the month's balances have settled. */
export const CLOSING_OPEN_DAY = 25;

const DAY_START = 8;

export const closingRequestSchema = z.object({
  month: z.string().refine(isMonthKey),
  today: z.string().refine(isIsoDate),
  items: z
    .array(
      z.object({
        assetId: z.string(),
        flowCents: z.number().int().safe(),
        currentCents: z.number().int().safe(),
      }),
    )
    .max(1000),
});

export type ClosingRequest = z.infer<typeof closingRequestSchema>;

export type ClosingEdits = Record<string, { flow?: string; value?: string }>;

export interface ClosingRow {
  asset: ManualAsset;
  flowInput: string;
  valueInput: string;
  flowCents: Cents | null;
  /** Null while the typed value is unreadable or negative. */
  valueCents: Cents | null;
  valid: boolean;
}

export interface ClosingDraft {
  rows: ClosingRow[];
  autoAssets: AutoAsset[];
  totalCents: Cents;
  contributionsCents: Cents;
}

/**
 * The month the next closing is for. Before any closing it is the previous calendar
 * month, so a new portfolio can register its baseline right away.
 */
export function openMonth(snapshots: Snapshot[], today: IsoDate): MonthKey {
  const last = snapshots.at(-1);
  return last ? shiftMonth(last.month, 1) : shiftMonth(monthOf(today), -1);
}

/** The first closing opens as soon as there is an asset; the others on the 25th of their month. */
export function closingAvailable(snapshots: Snapshot[], assetCount: number, today: IsoDate): boolean {
  if (snapshots.length === 0) return assetCount > 0;
  const open = openMonth(snapshots, today);
  const current = monthOf(today);
  return current > open || (current === open && Number(today.slice(DAY_START)) >= CLOSING_OPEN_DAY);
}

const isManual = (asset: Asset): asset is ManualAsset => asset.pricing === 'manual';
const isAuto = (asset: Asset): asset is AutoAsset => asset.pricing === 'auto';

function closingRow(asset: ManualAsset, edits: ClosingEdits, money: MoneyFormat): ClosingRow {
  const flowInput = edits[asset.id]?.flow ?? money.toInput(0);
  const valueInput = edits[asset.id]?.value ?? money.toInput(asset.currentCents);
  const flowCents = money.parseSigned(flowInput);
  const valueCents = money.parse(valueInput);
  return {
    asset,
    flowInput,
    valueInput,
    flowCents,
    valueCents,
    valid: flowCents !== null && valueCents !== null,
  };
}

/** What the closing dialog shows: untouched rows keep the last value and no flow. */
export function closingDraft(assets: Asset[], edits: ClosingEdits, money: MoneyFormat): ClosingDraft {
  const rows = assets
    .filter(isManual)
    .sort(
      (a, b) => a.institution.localeCompare(b.institution, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'),
    )
    .map((asset) => closingRow(asset, edits, money));
  const autoAssets = assets.filter(isAuto);
  return {
    rows,
    autoAssets,
    totalCents: sumCents(autoAssets.map(assetValue)) + sumCents(rows.map((r) => r.valueCents ?? 0)),
    contributionsCents: sumCents(rows.map((r) => r.flowCents ?? 0)),
  };
}

export function closingRequestFrom(
  draft: ClosingDraft,
  month: MonthKey,
  today: IsoDate,
  t: Translate,
): { request: ClosingRequest } | { error: string } {
  const items: ClosingRequest['items'] = [];
  for (const { asset, flowCents, valueCents } of draft.rows) {
    if (flowCents === null || valueCents === null) {
      return { error: t('closing.review', asset.name, asset.institution) };
    }
    items.push({ assetId: asset.id, flowCents, currentCents: valueCents });
  }
  return { request: { month, today, items } };
}

/**
 * The snapshot and the manual assets as they stand after the closing. A contribution raises
 * the invested amount, so it is not counted as yield. A withdrawal past the invested amount
 * stops at zero, since what is left is all gain. Call it with validated items.
 */
export function applyClosing(
  assets: Asset[],
  { month, today, items }: ClosingRequest,
): { snapshot: Snapshot; assets: ManualAsset[] } {
  const itemOf = new Map(items.map((item) => [item.assetId, item]));
  const updated = assets.filter(isManual).map((asset) => {
    const item = itemOf.get(asset.id);
    if (!item) return asset;
    return {
      ...asset,
      currentCents: item.currentCents,
      investedCents: asset.investedCents === null ? null : Math.max(0, asset.investedCents + item.flowCents),
      updatedAt: today,
    };
  });
  return {
    snapshot: {
      month,
      totalCents: sumCents(assets.filter(isAuto).map(assetValue)) + sumCents(updated.map(assetValue)),
      contributionsCents: sumCents(items.map((item) => item.flowCents)),
    },
    assets: updated,
  };
}
