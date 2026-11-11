import { randomUUID } from 'node:crypto';
import {
  recurringCandidates,
  recurringEntry,
  validateRecurringSelection,
  type MonthKey,
  type RecurringCandidate,
  type RecurringGenerateRequest,
  type Transaction,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { TransactionRepository, TranslateProvider } from '../ports';

export class ListRecurringCandidates {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(month: MonthKey): RecurringCandidate[] {
    return recurringCandidates(this.transactions.listAll(), month);
  }
}

/**
 * Creates the reviewed occurrences in one transaction. Candidates are recomputed here, so a
 * series generated meanwhile (another tab, a double click) is refused instead of duplicated.
 */
export class GenerateRecurring {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly translate: TranslateProvider,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute({ month, items }: RecurringGenerateRequest): Transaction[] {
    const candidates = new Map(
      recurringCandidates(this.transactions.listAll(), month).map((c) => [c.seriesId, c]),
    );
    const chosen = items.map((item) => {
      const candidate = candidates.get(item.seriesId);
      if (!candidate) throw new ApplicationError('conflict', this.translate()('recurring.stale'));
      // A series listed twice would generate twice.
      candidates.delete(item.seriesId);
      return { ...item, source: candidate.source };
    });

    const error = validateRecurringSelection(
      chosen.map((c) => ({ description: c.source.description, date: c.date, valueCents: c.valueCents })),
      month,
      this.translate(),
    );
    if (error) throw new ApplicationError('validation_error', error);

    const created = chosen.map((c) =>
      recurringEntry(c.source, { id: this.newId(), date: c.date, valueCents: c.valueCents }),
    );
    this.transactions.insertMany(created);
    return created;
  }
}
