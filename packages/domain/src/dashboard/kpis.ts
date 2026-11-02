import type { MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import { averageOf, type MonthSummary } from '../transactions/year-summary';

export type DashboardMonth = MonthSummary & { month: MonthKey };

export type AverageComparison =
  { kind: 'none' } | { kind: 'near' } | { kind: 'above' | 'below'; ratio: number };

export interface DashboardKpis {
  balance: {
    hasData: boolean;
    cents: Cents;
    previousMonth: MonthKey;
    previousHasData: boolean;
    differenceCents: Cents;
  };
  savingsRate: {
    /** Part of the income left, as a ratio; null without data or income. */
    rate: number | null;
    averageRate: number | null;
    differencePoints: number | null;
  };
  netSpend: { cents: Cents | null; comparison: AverageComparison };
  yearToDate: { activeMonths: number; cents: Cents; averageCents: Cents };
}

const NEAR_AVERAGE_RATIO = 0.03;
const PERCENT_POINTS = 100;

const isNumber = (value: number | null): value is number => value !== null;

function averageIgnoringNulls(values: (number | null)[]): number | null {
  const valid = values.filter(isNumber);
  return valid.length ? valid.reduce((total, v) => total + v, 0) / valid.length : null;
}

/** How a value sits against an average. Within 3% it counts as being on the average. */
export function compareToAverage(value: number | null, average: number | null): AverageComparison {
  if (value === null || !average) return { kind: 'none' };
  // The absolute value keeps above and below right when the average is negative.
  const distance = (value - average) / Math.abs(average);
  if (Math.abs(distance) < NEAR_AVERAGE_RATIO) return { kind: 'near' };
  return { kind: distance > 0 ? 'above' : 'below', ratio: Math.abs(distance) };
}

const savingsRateOf = (m: DashboardMonth): number | null =>
  m.hasData && m.incomeCents > 0 ? m.balanceCents / m.incomeCents : null;

const netSpendOf = (m: DashboardMonth): Cents | null =>
  m.hasData ? m.expenseCents - m.settlementCents : null;

/** The four tiles of Visão geral. Averages cover priorYear, which leaves the current month out. */
export function dashboardKpis({
  current,
  previous,
  priorYear,
  yearToDate,
}: {
  current: DashboardMonth;
  previous: DashboardMonth;
  priorYear: DashboardMonth[];
  yearToDate: DashboardMonth[];
}): DashboardKpis {
  const rate = savingsRateOf(current);
  const averageRate = averageIgnoringNulls(priorYear.map(savingsRateOf));
  const netSpend = netSpendOf(current);
  const activeMonths = yearToDate.filter((m) => m.hasData);
  const yearCents = sumCents(activeMonths.map((m) => m.balanceCents));

  return {
    balance: {
      hasData: current.hasData,
      cents: current.balanceCents,
      previousMonth: previous.month,
      previousHasData: previous.hasData,
      differenceCents: current.balanceCents - previous.balanceCents,
    },
    savingsRate: {
      rate,
      averageRate,
      differencePoints: rate === null || averageRate === null ? null : (rate - averageRate) * PERCENT_POINTS,
    },
    netSpend: {
      cents: netSpend,
      comparison: compareToAverage(netSpend, averageIgnoringNulls(priorYear.map(netSpendOf))),
    },
    yearToDate: {
      activeMonths: activeMonths.length,
      cents: yearCents,
      averageCents: averageOf(yearCents, activeMonths.length),
    },
  };
}
