import { randomUUID } from 'node:crypto';
import {
  CATEGORY_MESSAGES,
  validateCategoryName,
  type Category,
  type CategoryInput,
  type CategoryPatch,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { CategoryRepository, TransactionRepository } from '../ports';

const notFound = () => new ApplicationError('not_found', CATEGORY_MESSAGES.notFound);

function assertNameAvailable(categories: CategoryRepository, candidate: Category): void {
  const error = validateCategoryName(candidate.name, candidate.type, categories.list(), candidate.id);
  if (error === CATEGORY_MESSAGES.duplicate) throw new ApplicationError('conflict', error);
  if (error) throw new ApplicationError('validation_error', error);
}

export class CreateCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(input: CategoryInput): Category {
    const category = { ...input, id: this.newId(), name: input.name.trim() };
    assertNameAvailable(this.categories, category);
    this.categories.insert(category);
    return category;
  }
}

/** Renames and recolors; the type stays, since entries already rely on it. */
export class UpdateCategory {
  constructor(private readonly categories: CategoryRepository) {}

  execute(id: string, patch: CategoryPatch): Category {
    const current = this.categories.findById(id);
    if (!current) throw notFound();
    const category = { ...current, color: patch.color, name: patch.name.trim() };
    assertNameAvailable(this.categories, category);
    this.categories.update(category);
    return category;
  }
}

export class DeleteCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  execute(id: string): void {
    const category = this.categories.findById(id);
    if (!category) throw notFound();
    const inUse = this.transactions.listAll().some((t) => t.categoryId === id);
    if (inUse) throw new ApplicationError('conflict', CATEGORY_MESSAGES.inUse(category.name));
    this.categories.delete(id);
  }
}
