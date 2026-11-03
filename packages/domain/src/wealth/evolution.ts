import { niceAxis, type ChartAxis } from '../dashboard/dashboard';
import type { MonthKey } from '../dates/dates';
import type { Cents } from '../money/money';
import type { Snapshot } from './asset';

const CLOSED_MONTHS_SHOWN = 11;

export interface EvolutionPoint {
  month: MonthKey;
  totalCents: Cents;
  /** The open month, which is still moving. */
  partial: boolean;
  changeCents: Cents | null;
  contributionsCents: Cents | null;
  yieldCents: Cents | null;
}

export interface EvolutionSeries {
  points: EvolutionPoint[];
  axis: ChartAxis;
}

function closedPoint(snapshot: Snapshot, previous: Snapshot | undefined): EvolutionPoint {
  const changeCents = previous ? snapshot.totalCents - previous.totalCents : null;
  return {
    month: snapshot.month,
    totalCents: snapshot.totalCents,
    partial: false,
    changeCents,
    contributionsCents: snapshot.contributionsCents,
    yieldCents: changeCents === null ? null : changeCents - snapshot.contributionsCents,
  };
}

/** The last 11 closings, each compared with the one before it, plus the open month. */
export function evolutionSeries(snapshots: Snapshot[], open: MonthKey, totalCents: Cents): EvolutionSeries {
  const last = snapshots.at(-1);
  const firstShown = Math.max(0, snapshots.length - CLOSED_MONTHS_SHOWN);
  const points: EvolutionPoint[] = [
    ...snapshots.slice(firstShown).map((s, index) => closedPoint(s, snapshots[firstShown + index - 1])),
    {
      month: open,
      totalCents,
      partial: true,
      changeCents: last ? totalCents - last.totalCents : null,
      contributionsCents: null,
      yieldCents: null,
    },
  ];
  return { points, axis: niceAxis(Math.max(...points.map((p) => p.totalCents))) };
}
