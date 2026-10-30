import { categoryUsageCounts, type Category, type CategoryUsage } from '@livro-caixa/domain';
import type { CategoryRepository, TransactionRepository } from '../ports';

/** The categories and how many entries use each one, for the Configurações lists. */
export class ListCategories {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  execute(): { categories: Category[]; usage: CategoryUsage } {
    return {
      categories: this.categories.list(),
      usage: categoryUsageCounts(this.transactions.listAll()),
    };
  }
}
