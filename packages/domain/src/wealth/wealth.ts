import type { IsoDate, MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import { valueAssets, type Asset, type Snapshot, type ValuedAsset } from './asset';
import { closingAvailable, openMonth } from './closing';
import { evolutionSeries, type EvolutionSeries } from './evolution';
import { wealthKpis, type WealthKpis } from './kpis';

const BASIS_POINTS = 10_000;

export interface Wealth {
  totalCents: Cents;
  investedCents: Cents;
  dayChangeCents: Cents;
  openMonth: MonthKey;
  closingAvailable: boolean;
  assets: ValuedAsset[];
  kpis: WealthKpis;
  evolution: EvolutionSeries;
}

function dayChangeOf(asset: ValuedAsset): Cents {
  if (asset.pricing !== 'auto' || asset.dayChangeBps === null) return 0;
  return Math.round(asset.valueCents - asset.valueCents / (1 + asset.dayChangeBps / BASIS_POINTS));
}

/** Everything Patrimônio shows. An unknown cost counts at its value, so it adds no gain. */
export function buildWealth({
  assets,
  snapshots,
  today,
}: {
  assets: Asset[];
  snapshots: Snapshot[];
  today: IsoDate;
}): Wealth {
  const valued = valueAssets(assets);
  const totalCents = sumCents(valued.map((a) => a.valueCents));
  const investedCents = sumCents(valued.map((a) => a.costCents ?? a.valueCents));
  const open = openMonth(snapshots, today);
  return {
    totalCents,
    investedCents,
    dayChangeCents: sumCents(valued.map(dayChangeOf)),
    openMonth: open,
    closingAvailable: closingAvailable(snapshots, assets.length, today),
    assets: valued,
    kpis: wealthKpis(snapshots, totalCents, investedCents),
    evolution: evolutionSeries(snapshots, open, totalCents),
  };
}
