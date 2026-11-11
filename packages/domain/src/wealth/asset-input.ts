import { z } from 'zod';
import { isIsoDate } from '../dates/dates';
import type { Localization } from '../i18n/localization';
import type { Translate } from '../i18n/translate';
import type { Cents, MoneyFormat } from '../money/money';
import {
  ASSET_CLASS_KEYS,
  PRICING_MODES,
  type Asset,
  type AssetClass,
  type AutoAsset,
  type PricingMode,
} from './asset';

/** What the Novo/Editar ativo sheet holds: the amounts are still the text being typed. */
export interface AssetDraft {
  institution: string;
  name: string;
  assetClass: AssetClass;
  pricing: PricingMode;
  quantity: string;
  avgPrice: string;
  price: string;
  invested: string;
  current: string;
}

const amount = z.number().int().safe().nullable();

/** What the API accepts to create or replace an asset. */
export const assetInputSchema = z.object({
  institution: z.string().max(80),
  name: z.string().max(120),
  assetClass: z.enum(ASSET_CLASS_KEYS),
  pricing: z.enum(PRICING_MODES),
  quantityE8: amount,
  avgPriceCents: amount,
  priceCents: amount,
  investedCents: amount,
  currentCents: amount,
  /** The client's date, which becomes the asset's "Manual · dd/mm". */
  today: z.string().refine(isIsoDate),
});

export type AssetInput = z.infer<typeof assetInputSchema>;

export type AssetFields = Omit<AssetInput, 'assetClass' | 'today'>;

export function emptyAssetDraft(): AssetDraft {
  return {
    institution: '',
    name: '',
    assetClass: 'reserva',
    pricing: 'manual',
    quantity: '',
    avgPrice: '',
    price: '',
    invested: '',
    current: '',
  };
}

const optionalMoneyInput = (cents: Cents | null, money: MoneyFormat) =>
  cents === null ? '' : money.toInput(cents);

export function draftFromAsset(asset: Asset, money: MoneyFormat): AssetDraft {
  const base = {
    ...emptyAssetDraft(),
    institution: asset.institution,
    name: asset.name,
    assetClass: asset.assetClass,
    pricing: asset.pricing,
  };
  if (asset.pricing === 'manual') {
    return {
      ...base,
      invested: optionalMoneyInput(asset.investedCents, money),
      current: money.toInput(asset.currentCents),
    };
  }
  return {
    ...base,
    quantity: money.toQuantityInput(asset.quantityE8),
    avgPrice: optionalMoneyInput(asset.avgPriceCents, money),
    price: money.toInput(asset.priceCents),
  };
}

const isPositive = (value: number | null) => value !== null && value > 0;
// NaN stands for an optional field that holds something unreadable, and fails this check too.
const isValidOptional = (value: number | null) => value === null || value >= 0;

/** Returns the first problem in the order the design lists them, or null. */
export function validateAssetFields(fields: AssetFields, t: Translate): string | null {
  if (!fields.institution.trim()) return t('asset.institution');
  if (!fields.name.trim()) return t('asset.name');
  if (fields.pricing === 'auto') {
    if (!isPositive(fields.quantityE8)) return t('asset.quantity');
    if (!isPositive(fields.priceCents)) return t('asset.price');
    if (!isValidOptional(fields.avgPriceCents)) return t('asset.avgPrice');
    return null;
  }
  if (fields.currentCents === null || fields.currentCents < 0) return t('asset.current');
  if (!isValidOptional(fields.investedCents)) return t('asset.invested');
  return null;
}

const parseOptionalMoney = (raw: string, money: MoneyFormat): number | null =>
  raw.trim() === '' ? null : (money.parse(raw) ?? Number.NaN);

export function draftToAssetInput(
  draft: AssetDraft,
  today: string,
  { money, t }: Pick<Localization, 'money' | 't'>,
): { input: AssetInput } | { error: string } {
  const isAuto = draft.pricing === 'auto';
  const input: AssetInput = {
    institution: draft.institution.trim(),
    name: draft.name.trim(),
    assetClass: draft.assetClass,
    pricing: draft.pricing,
    quantityE8: isAuto ? money.parseQuantity(draft.quantity) : null,
    avgPriceCents: isAuto ? parseOptionalMoney(draft.avgPrice, money) : null,
    priceCents: isAuto ? money.parse(draft.price) : null,
    investedCents: isAuto ? null : parseOptionalMoney(draft.invested, money),
    currentCents: isAuto ? null : money.parse(draft.current),
    today,
  };
  const error = validateAssetFields(input, t);
  return error ? { error } : { input };
}

/** Whether an edit left the price as it was, so its quote and date still describe it. */
function sameQuotedPrice(
  existing: AutoAsset,
  { name, assetClass }: Pick<AutoAsset, 'name' | 'assetClass'>,
  priceCents: Cents,
): boolean {
  return existing.name === name && existing.assetClass === assetClass && existing.priceCents === priceCents;
}

/**
 * Keeps only the fields of the input's pricing mode. Call it with a validated input,
 * which is why a missing required amount can default to zero.
 */
export function toAsset(id: string, input: AssetInput, existing: Asset | null): Asset {
  const base = {
    id,
    institution: input.institution.trim(),
    name: input.name.trim(),
    assetClass: input.assetClass,
    updatedAt: input.today,
  };
  if (input.pricing === 'manual') {
    return {
      ...base,
      pricing: 'manual',
      investedCents: input.investedCents,
      currentCents: input.currentCents ?? 0,
    };
  }
  const priceCents = input.priceCents ?? 0;
  const kept = existing?.pricing === 'auto' && sameQuotedPrice(existing, base, priceCents) ? existing : null;
  return {
    ...base,
    updatedAt: kept?.updatedAt ?? base.updatedAt,
    pricing: 'auto',
    quantityE8: input.quantityE8 ?? 0,
    avgPriceCents: input.avgPriceCents,
    priceCents,
    dayChangeBps: kept?.dayChangeBps ?? null,
    quotedAt: kept?.quotedAt ?? null,
    quoteFailed: kept?.quoteFailed ?? false,
  };
}
