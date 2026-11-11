import {
  isIsoDate,
  lastDayOfMonth,
  monthLabel,
  monthOf,
  pad2,
  type IsoDate,
  type MonthKey,
} from '../dates/dates';
import type { Translate } from '../i18n/translate';
import type { Cents } from '../money/money';
import { compareByDate } from './list-query';
import type { Transaction } from './transaction';

export interface RecurringCandidate {
  seriesId: string;
  /** The source's day, capped at the month's last day. */
  date: IsoDate;
  valueCents: Cents;
  /** The latest occurrence of the series before the month. */
  source: Transaction;
}

/**
 * One suggestion per series whose latest earlier occurrence is still recurring and that has
 * no entry in the month yet, so generating twice never duplicates an entry.
 */
export function recurringCandidates(transactions: Transaction[], month: MonthKey): RecurringCandidate[] {
  const monthStart = `${month}-01`;
  const seriesInMonth = new Set(transactions.filter((t) => monthOf(t.date) === month).map((t) => t.seriesId));
  const latestBySeries = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.seriesId || t.date >= monthStart) continue;
    const latest = latestBySeries.get(t.seriesId);
    if (!latest || t.date > latest.date) latestBySeries.set(t.seriesId, t);
  }
  return [...latestBySeries.entries()]
    .filter(
      ([seriesId, source]) => source.recurring && source.type !== 'acerto' && !seriesInMonth.has(seriesId),
    )
    .map(([seriesId, source]) => ({
      seriesId,
      date: sameDayIn(month, source.date),
      valueCents: source.valueCents,
      source,
    }))
    .sort((a, b) => compareByDate(withDescription(a), withDescription(b)));
}

const withDescription = (c: RecurringCandidate) => ({ date: c.date, description: c.source.description });

function sameDayIn(month: MonthKey, date: IsoDate): IsoDate {
  const day = Math.min(Number(date.slice(8, 10)), lastDayOfMonth(month));
  return `${month}-${pad2(day)}`;
}

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
