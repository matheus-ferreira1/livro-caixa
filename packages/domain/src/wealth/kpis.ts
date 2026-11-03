import type { MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import type { Snapshot } from './asset';

const LAST_YEAR_CLOSINGS = 12;

export interface LastClosingKpi {
  month: MonthKey;
  totalCents: Cents;
  contributionsCents: Cents;
  /** These three are null for the first closing, which has nothing to compare with. */
  yieldCents: Cents | null;
  changeCents: Cents | null;
  changeRatio: number | null;
}

export interface LastYearKpi {
  baseMonth: MonthKey;
  changeCents: Cents;
  contributionsCents: Cents;
  yieldCents: Cents;
  ratio: number | null;
}

export interface WealthKpis {
  sinceLastClosing: { month: MonthKey; changeCents: Cents } | null;
  lastClosing: LastClosingKpi | null;
  lastYear: LastYearKpi | null;
  result: { gainCents: Cents; investedCents: Cents; ratio: number };
}

const ratioOf = (changeCents: Cents, baseCents: Cents) => (baseCents === 0 ? null : changeCents / baseCents);

function lastClosingKpi(last: Snapshot, prior: Snapshot | undefined): LastClosingKpi {
  const base = {
    month: last.month,
    totalCents: last.totalCents,
    contributionsCents: last.contributionsCents,
  };
  if (!prior) return { ...base, yieldCents: null, changeCents: null, changeRatio: null };
  const changeCents = last.totalCents - prior.totalCents;
  return {
    ...base,
    yieldCents: changeCents - last.contributionsCents,
    changeCents,
    changeRatio: ratioOf(changeCents, prior.totalCents),
  };
}

function lastYearKpi(snapshots: Snapshot[], last: Snapshot): LastYearKpi {
  const window = snapshots.slice(-(LAST_YEAR_CLOSINGS + 1));
  const [base = last, ...afterBase] = window;
  const changeCents = last.totalCents - base.totalCents;
  const contributionsCents = sumCents(afterBase.map((s) => s.contributionsCents));
  return {
    baseMonth: base.month,
    changeCents,
    contributionsCents,
    yieldCents: changeCents - contributionsCents,
    ratio: ratioOf(changeCents, base.totalCents),
  };
}

export function wealthKpis(snapshots: Snapshot[], totalCents: Cents, investedCents: Cents): WealthKpis {
  const gainCents = totalCents - investedCents;
  const result = { gainCents, investedCents, ratio: ratioOf(gainCents, investedCents) ?? 0 };
  const last = snapshots.at(-1);
  if (!last) return { sinceLastClosing: null, lastClosing: null, lastYear: null, result };
  return {
    sinceLastClosing: { month: last.month, changeCents: totalCents - last.totalCents },
    lastClosing: lastClosingKpi(last, snapshots.at(-2)),
    lastYear: lastYearKpi(snapshots, last),
    result,
  };
}
