import type { Asset, AutoAsset } from './asset';

export type QuoteStatus =
  | { kind: 'updated'; quotedAt: number }
  /** `quotedAt` is the last quote found, or null when the price was only ever typed. */
  | { kind: 'unavailable'; quotedAt: number | null };

export function quoteStatus({
  quotedAt,
  quoteFailed,
}: Pick<AutoAsset, 'quotedAt' | 'quoteFailed'>): QuoteStatus {
  if (quotedAt === null || quoteFailed) return { kind: 'unavailable', quotedAt };
  return { kind: 'updated', quotedAt };
}

export function unavailableQuoteCount(assets: readonly Asset[]): number {
  return assets.filter((asset) => asset.pricing === 'auto' && quoteStatus(asset).kind === 'unavailable')
    .length;
}
