import { yearSummary, type SummaryMode, type YearSummary } from '@livro-caixa/domain';
import type { SettingsRepository, TransactionRepository } from '../ports';

/** The Resumo mensal. Runs in the domain over all rows, like the "Todos" listing. */
export class GetYearSummary {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
  ) {}

  execute(year: number, mode: SummaryMode): YearSummary {
    return yearSummary(this.transactions.listAll(), year, mode, this.settings.get().partnerShare);
  }
}
