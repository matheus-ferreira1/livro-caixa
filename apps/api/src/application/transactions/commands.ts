import { randomUUID } from 'node:crypto';
import { toTransaction, validateInput, type Transaction, type TransactionInput } from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { CategoryRepository, TransactionRepository, TranslateProvider } from '../ports';

const notFound = (translate: TranslateProvider) =>
  new ApplicationError('not_found', translate()('transaction.notFound'));

/** The inline toggles of the list: status (Confirmado/Previsto) and split (Dividido). */
export class ToggleTransactionFlags {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string, patch: { confirmed?: boolean; split?: boolean }): Transaction {
    const current = this.transactions.findById(id);
    if (!current) throw notFound(this.translate);
    if (patch.split && current.type !== 'despesa')
      throw new ApplicationError('validation_error', this.translate()('transaction.splitOnlyExpenses'));
    const next = { ...current, ...patch };
    this.transactions.update(next);
    return next;
  }
}

export class DeleteTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string): void {
    if (!this.transactions.delete(id)) throw notFound(this.translate);
  }
}

/** Creates (id = null) or replaces an entry from the Novo/Editar lançamento form. */
export class SaveTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly translate: TranslateProvider,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(id: string | null, input: TransactionInput): Transaction {
    const existing = id ? this.transactions.findById(id) : null;
    if (id && !existing) throw notFound(this.translate);
    this.assertValid(input);
    const transaction = toTransaction(id ?? this.newId(), input, existing);
    if (existing) this.transactions.update(transaction);
    else this.transactions.insert(transaction);
    return transaction;
  }

  private assertValid(input: TransactionInput): void {
    const t = this.translate();
    const error = validateInput(input, t);
    if (error) throw new ApplicationError('validation_error', error);
    if (input.type === 'acerto' || !input.categoryId) return;
    const category = this.categories.findById(input.categoryId);
    if (category?.type !== input.type) throw new ApplicationError('validation_error', t('form.category'));
  }
}
