import { z } from 'zod';
import { isIsoDate } from '../dates/dates';
import { parseMoney, toMoneyInput, type Cents } from '../money/money';
import { ASSET_CLASS_KEYS, PRICING_MODES, type Asset, type AssetClass, type PricingMode } from './asset';
import { parseQuantity, toQuantityInput } from './quantity';

export const ASSET_MESSAGES = {
  institution: 'Informe o banco ou a corretora.',
  name: 'Informe o nome do ativo.',
  quantity: 'Informe uma quantidade maior que zero.',
  price: 'Informe a cotação atual.',
  avgPrice: 'Preço médio inválido.',
  current: 'Informe o valor atual.',
  invested: 'Valor aplicado inválido.',
  notFound: 'Ativo não encontrado.',
} as const;

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

const optionalMoneyInput = (cents: Cents | null) => (cents === null ? '' : toMoneyInput(cents));

export function draftFromAsset(asset: Asset): AssetDraft {
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
      invested: optionalMoneyInput(asset.investedCents),
      current: toMoneyInput(asset.currentCents),
    };
  }
  return {
    ...base,
    quantity: toQuantityInput(asset.quantityE8),
    avgPrice: optionalMoneyInput(asset.avgPriceCents),
    price: toMoneyInput(asset.priceCents),
  };
}

const isPositive = (value: number | null) => value !== null && value > 0;
// NaN stands for an optional field that holds something unreadable, and fails this check too.
const isValidOptional = (value: number | null) => value === null || value >= 0;

/** Returns the first problem in the order the design lists them, or null. */
export function validateAssetFields(fields: AssetFields): string | null {
  if (!fields.institution.trim()) return ASSET_MESSAGES.institution;
  if (!fields.name.trim()) return ASSET_MESSAGES.name;
  if (fields.pricing === 'auto') {
    if (!isPositive(fields.quantityE8)) return ASSET_MESSAGES.quantity;
    if (!isPositive(fields.priceCents)) return ASSET_MESSAGES.price;
    if (!isValidOptional(fields.avgPriceCents)) return ASSET_MESSAGES.avgPrice;
    return null;
  }
  if (fields.currentCents === null || fields.currentCents < 0) return ASSET_MESSAGES.current;
  if (!isValidOptional(fields.investedCents)) return ASSET_MESSAGES.invested;
  return null;
}

const parseOptionalMoney = (raw: string): number | null =>
  raw.trim() === '' ? null : (parseMoney(raw) ?? Number.NaN);

export function draftToAssetInput(
  draft: AssetDraft,
  today: string,
): { input: AssetInput } | { error: string } {
  const isAuto = draft.pricing === 'auto';
  const input: AssetInput = {
    institution: draft.institution.trim(),
    name: draft.name.trim(),
    assetClass: draft.assetClass,
    pricing: draft.pricing,
    quantityE8: isAuto ? parseQuantity(draft.quantity) : null,
    avgPriceCents: isAuto ? parseOptionalMoney(draft.avgPrice) : null,
    priceCents: isAuto ? parseMoney(draft.price) : null,
    investedCents: isAuto ? null : parseOptionalMoney(draft.invested),
    currentCents: isAuto ? null : parseMoney(draft.current),
    today,
  };
  const error = validateAssetFields(input);
  return error ? { error } : { input };
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
  return {
    ...base,
    pricing: 'auto',
    quantityE8: input.quantityE8 ?? 0,
    avgPriceCents: input.avgPriceCents,
    priceCents: input.priceCents ?? 0,
    dayChangeBps: existing?.pricing === 'auto' ? existing.dayChangeBps : null,
    quotedAt: null,
    quoteFailed: false,
  };
}
