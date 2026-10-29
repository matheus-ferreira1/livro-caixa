import { randomUUID } from 'node:crypto';
import {
  FORM_MESSAGES,
  toTransaction,
  validateInput,
  type Transaction,
  type TransactionInput,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { CategoryRepository, TransactionRepository } from '../ports';

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

/** Creates (id = null) or replaces an entry from the Novo/Editar lançamento form. */
export class SaveTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(id: string | null, input: TransactionInput): Transaction {
    const existing = id ? this.transactions.findById(id) : null;
    if (id && !existing) throw notFound();
    this.assertValid(input);
    const transaction = toTransaction(id ?? this.newId(), input, existing);
    if (existing) this.transactions.update(transaction);
    else this.transactions.insert(transaction);
    return transaction;
  }

  private assertValid(input: TransactionInput): void {
    const error = validateInput(input);
    if (error) throw new ApplicationError('validation_error', error);
    if (input.type === 'acerto' || !input.categoryId) return;
    const category = this.categories.findById(input.categoryId);
    if (category?.type !== input.type) throw new ApplicationError('validation_error', FORM_MESSAGES.category);
  }
}
