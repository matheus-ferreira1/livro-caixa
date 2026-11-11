import { daysBetween, type IsoDate } from '../dates/dates';
import type { Translate } from '../i18n/translate';
import { sumCents, type Cents } from '../money/money';
import { compareByDate } from '../transactions/list-query';
import type { Category, Transaction } from '../transactions/transaction';

const MAX_OPEN_ROWS = 5;
const SOON_DAYS = 3;

export type DueTone = 'late' | 'soon' | 'later';

export interface OpenItem extends Transaction {
  categoryName: string | null;
}

export interface OpenItems {
  /** The first ones by date; `count` says how many there are in all. */
  items: OpenItem[];
  count: number;
  outflowCents: Cents;
  inflowCents: Cents;
}

const totalOf = (list: Transaction[]): Cents => sumCents(list.map((t) => t.valueCents));

/** What is still unconfirmed in the month, whatever the dashboard's mode. */
export function openItems(monthTransactions: Transaction[], categories: Category[]): OpenItems {
  const pending = monthTransactions.filter((t) => !t.confirmed).sort(compareByDate);
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return {
    items: pending.slice(0, MAX_OPEN_ROWS).map((t) => ({
      ...t,
      categoryName: (t.categoryId && nameById.get(t.categoryId)) ?? null,
    })),
    count: pending.length,
    outflowCents: totalOf(pending.filter((t) => t.type === 'despesa')),
    inflowCents: totalOf(pending.filter((t) => t.type !== 'despesa')),
  };
}

function dueLabel(days: number, t: Translate): string {
  if (days < 0) return t('due.late');
  if (days === 0) return t('due.today');
  return days === 1 ? t('due.tomorrow') : t('due.inDays', days);
}

function dueTone(days: number): DueTone {
  if (days < 0) return 'late';
  return days <= SOON_DAYS ? 'soon' : 'later';
}

/** How an open item's date reads against the client's "today". */
export function relativeDue(date: IsoDate, today: IsoDate, t: Translate): { label: string; tone: DueTone } {
  const days = daysBetween(today, date);
  return { label: dueLabel(days, t), tone: dueTone(days) };
}
