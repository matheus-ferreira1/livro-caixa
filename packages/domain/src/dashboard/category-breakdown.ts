import type { MonthKey } from '../dates/dates';
import { sumCents, type Cents } from '../money/money';
import type { Category, Transaction } from '../transactions/transaction';
import type { SummaryMode } from '../transactions/year-summary';
import { compareToAverage, type AverageComparison } from './kpis';

export const OTHERS_SLICE_ID = 'outras';
export const OTHERS_COLOR = '#9AA29D';

const MAX_SLICES = 6;
const NO_CATEGORY_KEY = 'none';
const NO_CATEGORY_NAME = 'Sem categoria';

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  valueCents: Cents;
  /** Part of the month's expenses, as a ratio. */
  share: number;
  comparison: AverageComparison;
}

export interface CategoryBreakdown {
  /** By value, largest first, with "Outras" last. */
  slices: CategorySlice[];
  totalCents: Cents;
  count: number;
}

const categoryKey = (t: Transaction): string => t.categoryId ?? NO_CATEGORY_KEY;

function totalsByCategory(expenses: Transaction[]): Map<string, Cents> {
  const totals = new Map<string, Cents>();
  for (const t of expenses) {
    totals.set(categoryKey(t), (totals.get(categoryKey(t)) ?? 0) + t.valueCents);
  }
  return totals;
}

/** The month's expenses by category, compared with the months of `history` that had any. */
export function categoryBreakdown({
  current,
  history,
  categories,
  mode,
}: {
  current: Transaction[];
  history: ReadonlyMap<MonthKey, Transaction[]>;
  categories: Category[];
  mode: SummaryMode;
}): CategoryBreakdown {
  const counted = (list: Transaction[]) =>
    list.filter((t) => t.type === 'despesa' && (mode === 'proj' || t.confirmed));

  const expenses = counted(current);
  const totalCents = sumCents(expenses.map((t) => t.valueCents));
  const pastTotals = [...history.values()]
    .map(counted)
    .filter((list) => list.length > 0)
    .map(totalsByCategory);
  const averageOfKeys = (keys: string[]): number | null =>
    pastTotals.length
      ? pastTotals.reduce(
          (sum, totals) => sum + keys.reduce((inner, key) => inner + (totals.get(key) ?? 0), 0),
          0,
        ) / pastTotals.length
      : null;

  const namedById = new Map(categories.map((c) => [c.id, c]));
  const ranked = [...totalsByCategory(expenses)].sort(([, a], [, b]) => b - a);

  const toSlice = (
    id: string,
    name: string,
    color: string,
    valueCents: Cents,
    keys: string[],
  ): CategorySlice => ({
    id,
    name,
    color,
    valueCents,
    share: valueCents / totalCents,
    comparison: compareToAverage(valueCents, averageOfKeys(keys)),
  });

  const slices = ranked.slice(0, MAX_SLICES).map(([key, valueCents]) => {
    const category = namedById.get(key);
    return toSlice(key, category?.name ?? NO_CATEGORY_NAME, category?.color ?? OTHERS_COLOR, valueCents, [
      key,
    ]);
  });

  const rest = ranked.slice(MAX_SLICES);
  if (rest.length > 0) {
    slices.push(
      toSlice(
        OTHERS_SLICE_ID,
        `Outras (${rest.length})`,
        OTHERS_COLOR,
        sumCents(rest.map(([, cents]) => cents)),
        rest.map(([key]) => key),
      ),
    );
  }

  return { slices, totalCents, count: expenses.length };
}
