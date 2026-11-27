import {
  datesOfMonth,
  isIsoDate,
  lastDayOfMonth,
  monthLabel,
  monthOf,
  pad2,
  weekdayOf,
  type IsoDate,
  type MonthKey,
} from '../dates/dates';
import type { Translate } from '../i18n/translate';
import type { Cents } from '../money/money';
import { compareByDate } from './list-query';
import type { Transaction } from './transaction';

export interface RecurringCandidate {
  seriesId: string;
  /** Monthly: the source's day, capped at the month's last day. Weekly: one matching weekday. */
  date: IsoDate;
  valueCents: Cents;
  /** The latest occurrence of the series on or before the month's last day; it carries the recurrence. */
  source: Transaction;
}

/**
 * The occurrences still missing from the month, one per date. Each series follows its source: the
 * latest occurrence up to the month's end, so a later month never hides an earlier one, and an entry
 * already in the month stops a monthly series and moves a weekly one past its date. Generating twice
 * never duplicates an entry.
 */
export function recurringCandidates(transactions: Transaction[], month: MonthKey): RecurringCandidate[] {
  return [...latestOccurrenceBySeries(transactions, month)]
    .filter(([, source]) => source.recurring && source.type !== 'acerto')
    .flatMap(([seriesId, source]) =>
      candidateDates(source, month).map((date) => ({
        seriesId,
        date,
        valueCents: source.valueCents,
        source,
      })),
    )
    .sort((a, b) => compareByDate(withDescription(a), withDescription(b)));
}

function latestOccurrenceBySeries(transactions: Transaction[], month: MonthKey): Map<string, Transaction> {
  const monthEnd = `${month}-${pad2(lastDayOfMonth(month))}`;
  const latestBySeries = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.seriesId || t.date > monthEnd) continue;
    const latest = latestBySeries.get(t.seriesId);
    if (!latest || t.date > latest.date) latestBySeries.set(t.seriesId, t);
  }
  return latestBySeries;
}

function candidateDates(source: Transaction, month: MonthKey): IsoDate[] {
  const { recurrence } = source;
  if (recurrence.frequency === 'weekly') {
    return datesOfMonth(month).filter(
      (date) => date > source.date && recurrence.weekdays.includes(weekdayOf(date)),
    );
  }
  return monthOf(source.date) < month ? [sameDayIn(month, source.date)] : [];
}

const withDescription = (c: RecurringCandidate) => ({ date: c.date, description: c.source.description });

function sameDayIn(month: MonthKey, date: IsoDate): IsoDate {
  const day = Math.min(Number(date.slice(8, 10)), lastDayOfMonth(month));
  return `${month}-${pad2(day)}`;
}

/** What the generate request sends per occurrence. */
export interface RecurringItem {
  seriesId: string;
  date: IsoDate;
}

export type RecurringMatch<Item extends RecurringItem> =
  { status: 'matched'; matched: { item: Item; source: Transaction }[] } | { status: 'stale' };

/**
 * Pairs each requested occurrence with a fresh candidate, so a series generated meanwhile (another
 * tab, a double click) is refused instead of duplicated. A monthly series is matched by series alone,
 * once, because the dialog lets its date change; a weekly series by series and date, each date once.
 */
export function matchRecurringItems<Item extends RecurringItem>(
  candidates: readonly RecurringCandidate[],
  items: readonly Item[],
): RecurringMatch<Item> {
  const open = new Map(candidates.map((c) => [candidateKey(c), c]));
  const matched: { item: Item; source: Transaction }[] = [];
  for (const item of items) {
    const key = isWeeklySeries(candidates, item.seriesId) ? weeklyKey(item) : item.seriesId;
    const candidate = open.get(key);
    if (!candidate) return { status: 'stale' };
    open.delete(key);
    matched.push({ item, source: candidate.source });
  }
  return { status: 'matched', matched };
}

const weeklyKey = ({ seriesId, date }: RecurringItem): string => `${seriesId}|${date}`;

const candidateKey = (c: RecurringCandidate): string =>
  c.source.recurrence.frequency === 'weekly' ? weeklyKey(c) : c.seriesId;

const isWeeklySeries = (candidates: readonly RecurringCandidate[], seriesId: string): boolean =>
  candidates.some((c) => c.seriesId === seriesId && c.source.recurrence.frequency === 'weekly');

export interface RecurringChoice {
  description: string;
  date: IsoDate;
  /** null when the typed value does not parse. */
  valueCents: Cents | null;
}

/** The first problem with the chosen entries, in the order the dialog lists them, or null. */
export function validateRecurringSelection(
  choices: RecurringChoice[],
  month: MonthKey,
  t: Translate,
): string | null {
  if (choices.length === 0) return t('recurring.noneSelected');
  const invalid = choices.find((c) => !isDateInMonth(c.date, month) || !(c.valueCents && c.valueCents > 0));
  return invalid ? t('recurring.review', invalid.description, monthLabel(month, t)) : null;
}

const isDateInMonth = (date: string, month: MonthKey): boolean => isIsoDate(date) && monthOf(date) === month;

/** The new occurrence: pending and without the source's note, in the same series. */
export const recurringEntry = (
  source: Transaction,
  { id, date, valueCents }: { id: string; date: IsoDate; valueCents: Cents },
): Transaction => ({ ...source, id, date, valueCents, note: '', confirmed: false, recurring: true });
