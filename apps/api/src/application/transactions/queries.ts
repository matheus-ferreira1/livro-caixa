import {
  filterTransactions,
  groupByMonth,
  paginate,
  sortTransactions,
  totalsOf,
  type MonthKey,
  type SortDirection,
  type SortKey,
  type Transaction,
  type TransactionFilters,
} from '@livro-caixa/domain';
import type { TransactionRepository } from '../ports';

export class ListMonthTransactions {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(month: MonthKey): Transaction[] {
    return this.transactions.listByMonth(month);
  }
}

export interface SearchInput extends TransactionFilters {
  sort: SortKey;
  dir: SortDirection;
  page: number;
  pageSize: number;
}

/**
 * The "Todos" listing. Filtering runs in the domain over all rows: a household ledger
 * holds thousands of entries at most, and the rules stay in one tested place.
 */
export class SearchTransactions {
  constructor(private readonly transactions: TransactionRepository) {}

  execute({ sort, dir, page, pageSize, ...filters }: SearchInput) {
    const filtered = sortTransactions(filterTransactions(this.transactions.listAll(), filters), sort, dir);
    const result = paginate(filtered, page, pageSize);
    return {
      ...result,
      total: filtered.length,
      totals: totalsOf(filtered),
      groups: groupByMonth(result.items, filtered).map(({ items, ...group }) => ({
        ...group,
        ids: items.map((t) => t.id),
      })),
    };
  }
}
