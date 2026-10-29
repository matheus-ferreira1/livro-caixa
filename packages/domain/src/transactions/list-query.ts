import { lastDayOfMonth, monthOf, shiftMonth, type IsoDate, type MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import { signedCents, type Transaction, type TransactionType } from './transaction';

export type TypeFilter = 'all' | TransactionType;
export type StatusFilter = 'all' | 'confirmed' | 'pending';
/** A category id, "all", or "none" for entries without category (acertos). */
export type CategoryFilter = string;
export type Period = 'all' | 'year' | '12m' | 'custom';
export type SortKey = 'date' | 'description' | 'value';
export type SortDirection = 'asc' | 'desc';
export type ListMode = 'month' | 'all';

export const PAGE_SIZES = [25, 50, 100] as const;
export const NO_CATEGORY = 'none';

export interface TransactionFilters {
  type?: TypeFilter;
  status?: StatusFilter;
  category?: CategoryFilter;
  query?: string;
  from?: IsoDate | null;
  to?: IsoDate | null;
}

export function filterTransactions(list: Transaction[], f: TransactionFilters): Transaction[] {
  const query = f.query?.trim().toLowerCase() ?? '';
  return list.filter(
    (t) =>
      (!f.type || f.type === 'all' || t.type === f.type) &&
      (!f.status || f.status === 'all' || (f.status === 'confirmed') === t.confirmed) &&
      matchesCategory(t, f.category) &&
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      (!query || `${t.description} ${t.note}`.toLowerCase().includes(query)),
  );
}

function matchesCategory(t: Transaction, category: CategoryFilter | undefined): boolean {
  if (!category || category === 'all') return true;
  return category === NO_CATEGORY ? t.categoryId === null : t.categoryId === category;
}

export function periodRange(
  period: Period,
  today: IsoDate,
  custom: { from?: string; to?: string } = {},
): { from: IsoDate | null; to: IsoDate | null } {
  const year = today.slice(0, 4);
  const thisMonth: MonthKey = monthOf(today);
  switch (period) {
    case 'year':
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case '12m':
      return { from: `${shiftMonth(thisMonth, -11)}-01`, to: `${thisMonth}-${lastDayOfMonth(thisMonth)}` };
    case 'custom':
      return { from: custom.from || null, to: custom.to || null };
    case 'all':
      return { from: null, to: null };
  }
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const COMPARATORS: Record<SortKey, (a: Transaction, b: Transaction) => number> = {
  date: (a, b) => a.date.localeCompare(b.date) || collator.compare(a.description, b.description),
  description: (a, b) => collator.compare(a.description, b.description) || a.date.localeCompare(b.date),
  value: (a, b) => a.valueCents - b.valueCents || a.date.localeCompare(b.date),
};

export function sortTransactions(list: Transaction[], key: SortKey, direction: SortDirection): Transaction[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => sign * COMPARATORS[key](a, b));
}

export function defaultSortDirection(key: SortKey, mode: ListMode): SortDirection {
  if (key === 'date') return mode === 'all' ? 'desc' : 'asc';
  return key === 'description' ? 'asc' : 'desc';
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  /** 1-based index of the first and last item shown, 0 when empty. */
  start: number;
  end: number;
}

export function paginate<T>(items: T[], requestedPage: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    totalPages,
    start: items.length ? offset + 1 : 0,
    end: Math.min(items.length, offset + pageSize),
  };
}

/** Page numbers around the current one, with gaps: 1 … 5 6 7 … 12. */
export function pageList(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  return wanted.flatMap((p, i) => (i > 0 && p - (wanted[i - 1] ?? p) > 1 ? ['gap' as const, p] : [p]));
}

export interface MonthGroup {
  monthKey: MonthKey;
  /** Counts and net come from the whole filtered set, not only the visible page. */
  count: number;
  netCents: Cents;
  items: Transaction[];
}

export function groupByMonth(visible: Transaction[], filtered: Transaction[]): MonthGroup[] {
  const stats = new Map<MonthKey, { count: number; net: Cents }>();
  for (const t of filtered) {
    const s = stats.get(monthOf(t.date)) ?? { count: 0, net: 0 };
    stats.set(monthOf(t.date), { count: s.count + 1, net: s.net + signedCents(t) });
  }
  const groups: MonthGroup[] = [];
  for (const t of visible) {
    const key = monthOf(t.date);
    let group = groups.at(-1);
    if (!group || group.monthKey !== key) {
      const s = stats.get(key) ?? { count: 0, net: 0 };
      group = { monthKey: key, count: s.count, netCents: s.net, items: [] };
      groups.push(group);
    }
    group.items.push(t);
  }
  return groups;
}

export interface Totals {
  incomeCents: Cents;
  expenseCents: Cents;
  settlementCents: Cents;
  balanceCents: Cents;
}

export function totalsOf(list: Transaction[]): Totals {
  const of = (type: TransactionType) =>
    sumCents(list.filter((t) => t.type === type).map((t) => t.valueCents));
  const incomeCents = of('receita');
  const expenseCents = of('despesa');
  const settlementCents = of('acerto');
  return {
    incomeCents,
    expenseCents,
    settlementCents,
    balanceCents: incomeCents + settlementCents - expenseCents,
  };
}
