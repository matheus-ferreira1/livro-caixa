import {
  buildDashboard,
  translator,
  type Dashboard,
  type MonthKey,
  type SummaryMode,
} from '@livro-caixa/domain';
import type { CategoryRepository, SettingsRepository, TransactionRepository } from '../ports';

/** Visão geral. Runs in the domain over all rows, like the Resumo mensal. */
export class GetDashboard {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly settings: SettingsRepository,
  ) {}

  execute(month: MonthKey, mode: SummaryMode): Dashboard {
    const settings = this.settings.get();
    return buildDashboard({
      transactions: this.transactions.listAll(),
      categories: this.categories.list(),
      settings,
      month,
      mode,
      t: translator(settings.language),
    });
  }
}
