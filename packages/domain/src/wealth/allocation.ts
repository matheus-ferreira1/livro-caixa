import { CATEGORY_PALETTE } from '../categories/categories';
import { sumCents, type Cents } from '../money/money';
import { ASSET_CLASSES, institutionsOf, type ValuedAsset } from './asset';

const NEUTRAL_COLOR = '#9AA29D';
/** A slice below this is too thin to see, so it stays only in the legend. */
const MINIMUM_VISIBLE_SHARE = 0.002;

export type WealthGrouping = 'class' | 'institution';

export interface AssetGroup {
  key: string;
  name: string;
  color: string;
  /** Position of the class or institution, which keeps colors in a stable order in the bar. */
  order: number;
  valueCents: Cents;
  share: number;
  assets: ValuedAsset[];
}

type GroupIdentity = Pick<AssetGroup, 'name' | 'color' | 'order'>;

function classIdentity(key: string): GroupIdentity {
  const order = ASSET_CLASSES.findIndex((c) => c.key === key);
  const assetClass = ASSET_CLASSES[order];
  return { name: assetClass?.label ?? key, color: assetClass?.color ?? NEUTRAL_COLOR, order };
}

const institutionIdentity =
  (institutions: string[]) =>
  (key: string): GroupIdentity => {
    const order = institutions.indexOf(key);
    return { name: key, color: CATEGORY_PALETTE[order] ?? NEUTRAL_COLOR, order };
  };

/** The groups shared by the allocation card and the assets table, biggest first. */
export function groupAssets(assets: ValuedAsset[], grouping: WealthGrouping): AssetGroup[] {
  const byClass = grouping === 'class';
  const identityOf = byClass ? classIdentity : institutionIdentity(institutionsOf(assets));
  const members = new Map<string, ValuedAsset[]>();
  for (const asset of assets) {
    const key = byClass ? asset.assetClass : asset.institution;
    members.set(key, [...(members.get(key) ?? []), asset]);
  }
  return [...members.entries()]
    .map(([key, list]) => ({
      key,
      ...identityOf(key),
      valueCents: sumCents(list.map((a) => a.valueCents)),
      share: list.reduce((acc, a) => acc + a.share, 0),
      assets: [...list].sort((a, b) => b.valueCents - a.valueCents),
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}

export const allocationSegments = (groups: AssetGroup[]): AssetGroup[] =>
  groups.filter((g) => g.share >= MINIMUM_VISIBLE_SHARE).sort((a, b) => a.order - b.order);
