import type { Transaction } from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { TransactionRepository } from '../ports';

export const SPLIT_ONLY_EXPENSES = 'Só despesas podem ser divididas.';

const notFound = () => new ApplicationError('not_found', 'Lançamento não encontrado.');

/** The inline toggles of the list: status (Confirmado/Previsto) and split (Dividido). */
export class ToggleTransactionFlags {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(id: string, patch: { confirmed?: boolean; split?: boolean }): Transaction {
    const current = this.transactions.findById(id);
    if (!current) throw notFound();
    if (patch.split && current.type !== 'despesa')
      throw new ApplicationError('validation_error', SPLIT_ONLY_EXPENSES);
    const next = { ...current, ...patch };
    this.transactions.update(next);
    return next;
  }
}

export class DeleteTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(id: string): void {
    if (!this.transactions.delete(id)) throw notFound();
  }
}
