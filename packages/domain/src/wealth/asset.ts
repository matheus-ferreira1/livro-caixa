import type { IsoDate, MonthKey } from '../dates/dates';
import type { Cents } from '../money/money';
import { QUANTITY_SCALE } from './quantity';

export const ASSET_CLASSES = [
  { key: 'reserva', label: 'Reserva', color: '#2A78D6' },
  { key: 'tesouro', label: 'Tesouro Direto', color: '#EB6834' },
  { key: 'garantia', label: 'Garantias', color: '#1BAF7A' },
  { key: 'etf', label: 'ETFs', color: '#EDA100' },
  { key: 'fii', label: 'Fundos imobiliários', color: '#E87BA4' },
  { key: 'cripto', label: 'Cripto', color: '#008300' },
  { key: 'cambio', label: 'Câmbio', color: '#6250D6' },
  { key: 'conta', label: 'Conta e poupança', color: '#9AA29D' },
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number]['key'];

export const assetClassLabel = (key: AssetClass): string =>
  ASSET_CLASSES.find((c) => c.key === key)?.label ?? key;

export const ASSET_CLASS_KEYS = ASSET_CLASSES.map((c) => c.key) as [AssetClass, ...AssetClass[]];

/** The classes quoted automatically. Crypto and currency quotes need a paid plan, so they stay typed. */
export const QUOTED_ASSET_CLASSES: readonly AssetClass[] = ['etf', 'fii'];

/** The scale of a quote's daily change: 100 basis points are 1%. */
export const BASIS_POINTS = 10_000;

export const PRICING_MODES = ['auto', 'manual'] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

interface AssetBase {
  id: string;
  institution: string;
  name: string;
  assetClass: AssetClass;
  updatedAt: IsoDate;
}

/** Valued as quantity × quote. */
export interface AutoAsset extends AssetBase {
  pricing: 'auto';
  quantityE8: number;
  /** Null when the cost is unknown. */
  avgPriceCents: Cents | null;
  priceCents: Cents;
  /** Change of the quote today, in basis points. Null until a quote provides it. */
  dayChangeBps: number | null;
}

/** Valued by what is typed at each closing. */
export interface ManualAsset extends AssetBase {
  pricing: 'manual';
  /** Null when the cost is unknown. */
  investedCents: Cents | null;
  currentCents: Cents;
}

export type Asset = AutoAsset | ManualAsset;

/** One monthly closing. */
export interface Snapshot {
  month: MonthKey;
  totalCents: Cents;
  /** Net of contributions and withdrawals in the month, so it can be negative. */
  contributionsCents: Cents;
}

export type ValuedAsset = Asset & {
  valueCents: Cents;
  costCents: Cents | null;
  resultCents: Cents | null;
  /** Part of the portfolio, from 0 to 1. */
  share: number;
};

export function assetValue(asset: Asset): Cents {
  if (asset.pricing === 'manual') return asset.currentCents;
  return Math.round((asset.quantityE8 * asset.priceCents) / QUANTITY_SCALE);
}

/** Null means the cost is unknown, so no result can be shown. */
export function assetCost(asset: Asset): Cents | null {
  if (asset.pricing === 'manual') return asset.investedCents;
  if (asset.avgPriceCents === null) return null;
  return Math.round((asset.quantityE8 * asset.avgPriceCents) / QUANTITY_SCALE);
}

export function valueAssets(assets: Asset[]): ValuedAsset[] {
  const totalCents = assets.reduce((acc, asset) => acc + assetValue(asset), 0);
  return assets.map((asset) => {
    const valueCents = assetValue(asset);
    const costCents = assetCost(asset);
    return {
      ...asset,
      valueCents,
      costCents,
      resultCents: costCents === null ? null : valueCents - costCents,
      share: totalCents > 0 ? valueCents / totalCents : 0,
    };
  });
}

export const institutionsOf = (assets: Pick<Asset, 'institution'>[]): string[] => [
  ...new Set(assets.map((asset) => asset.institution)),
];
