import { monthOf, pad2, shiftMonth, type MonthKey } from '../dates/dates';
import type { Translate } from '../i18n/translate';
import type { Cents } from '../money/money';
import { computeSettlement } from '../transactions/month-summary';
import {
  displayPartnerName,
  type Category,
  type PartnerSettings,
  type Transaction,
} from '../transactions/transaction';
import { monthSummary, type SummaryMode } from '../transactions/year-summary';
import { categoryBreakdown, type CategoryBreakdown } from './category-breakdown';
import { dashboardKpis, type DashboardKpis, type DashboardMonth } from './kpis';
import { openItems, type OpenItems } from './open-items';

const WINDOW_MONTHS = 12;
const AXIS_INTERVALS = 4;
// A R$ 4 scale gives whole-real ticks, which the one-decimal compact format can show exactly.
const AXIS_MINIMUM_CENTS = 400;

export type SettlementCardStatus = 'none' | 'settled' | 'partial' | 'pending';

export interface SettlementCard {
  status: SettlementCardStatus;
  pendingCents: Cents;
  expectedCents: Cents;
  receivedCents: Cents;
  /** Part of the expected amount already received, from 0 to 1. */
  progress: number;
  itemCount: number;
  totalCents: Cents;
}

export interface Dashboard {
  month: MonthKey;
  mode: SummaryMode;
  partnerName: string;
  kpis: DashboardKpis;
  /** The 12 months ending at the viewed month. */
  series: DashboardMonth[];
  categories: CategoryBreakdown;
  open: OpenItems;
  settlement: SettlementCard;
}

export interface ChartAxis {
  ticks: Cents[];
  topCents: Cents;
}

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = [1, 2, 2.5, 5].find((candidate) => fraction <= candidate) ?? 10;
  return nice * magnitude;
}

/** Y-axis ticks in round steps, from zero to at least the maximum. */
export function niceAxis(maximumCents: Cents): ChartAxis {
  const maximum = Math.max(AXIS_MINIMUM_CENTS, maximumCents);
  const step = niceStep(maximum / AXIS_INTERVALS);
  const intervals = Math.ceil(maximum / step);
  return {
    ticks: Array.from({ length: intervals + 1 }, (_, index) => index * step),
    topCents: intervals * step,
  };
}

function statusOf(expectedCents: Cents, pendingCents: Cents, receivedCents: Cents): SettlementCardStatus {
  if (expectedCents === 0) return 'none';
  if (pendingCents === 0) return 'settled';
  return receivedCents > 0 ? 'partial' : 'pending';
}

/** The acerto card always counts previstos, and only money received lowers what is pending. */
export function settlementCard(monthTransactions: Transaction[], share: number): SettlementCard {
  const s = computeSettlement(monthTransactions, share, { includePending: true });
  const pendingCents = Math.max(0, s.partnerCents - s.receivedCents);
  return {
    status: statusOf(s.partnerCents, pendingCents, s.receivedCents),
    pendingCents,
    expectedCents: s.partnerCents,
    receivedCents: s.receivedCents,
    progress: s.partnerCents > 0 ? Math.min(1, s.receivedCents / s.partnerCents) : 0,
    itemCount: s.items.length,
    totalCents: s.totalCents,
  };
}

function groupByMonth(transactions: Transaction[]): Map<MonthKey, Transaction[]> {
  const groups = new Map<MonthKey, Transaction[]>();
  for (const t of transactions) {
    const month = monthOf(t.date);
    const group = groups.get(month);
    if (group) group.push(t);
    else groups.set(month, [t]);
  }
  return groups;
}

const monthsOfYearUpTo = (month: MonthKey): MonthKey[] => {
  const year = month.slice(0, 4);
  return Array.from({ length: Number(month.slice(5)) }, (_, index) => `${year}-${pad2(index + 1)}`);
};

/** Everything Visão geral shows for one month, from entries of any period. */
export function buildDashboard({
  transactions,
  categories,
  settings,
  month,
  mode,
  t,
}: {
  transactions: Transaction[];
  categories: Category[];
  settings: PartnerSettings;
  month: MonthKey;
  mode: SummaryMode;
  t: Translate;
}): Dashboard {
  const byMonth = groupByMonth(transactions);
  const entriesOf = (key: MonthKey) => byMonth.get(key) ?? [];
  const summaryOf = (key: MonthKey): DashboardMonth => ({
    month: key,
    ...monthSummary(entriesOf(key), mode, settings.partnerShare),
  });
  // Two windows: the bars end at the viewed month, and the averages stop just before it.
  const monthsBack = (offset: number) =>
    Array.from({ length: WINDOW_MONTHS }, (_, index) => shiftMonth(month, index - offset));
  const series = monthsBack(WINDOW_MONTHS - 1).map(summaryOf);
  const priorMonths = monthsBack(WINDOW_MONTHS);
  const current = entriesOf(month);

  return {
    month,
    mode,
    partnerName: displayPartnerName(settings, t),
    kpis: dashboardKpis({
      current: summaryOf(month),
      previous: summaryOf(shiftMonth(month, -1)),
      priorYear: priorMonths.map(summaryOf),
      yearToDate: monthsOfYearUpTo(month).map(summaryOf),
    }),
    series,
    categories: categoryBreakdown({
      current,
      history: new Map(priorMonths.map((key) => [key, entriesOf(key)])),
      categories,
      mode,
      t,
    }),
    open: openItems(current, categories),
    settlement: settlementCard(current, settings.partnerShare),
  };
}
