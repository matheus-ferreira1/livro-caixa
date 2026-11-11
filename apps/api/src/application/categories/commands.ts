import { randomUUID } from 'node:crypto';
import {
  categoryNameProblem,
  type Category,
  type CategoryInput,
  type CategoryPatch,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { CategoryRepository, TransactionRepository, TranslateProvider } from '../ports';

const notFound = (translate: TranslateProvider) =>
  new ApplicationError('not_found', translate()('category.notFound'));

function assertNameAvailable(
  categories: CategoryRepository,
  candidate: Category,
  translate: TranslateProvider,
): void {
  const problem = categoryNameProblem(candidate.name, candidate.type, categories.list(), candidate.id);
  if (!problem) return;
  const code = problem === 'duplicate' ? 'conflict' : 'validation_error';
  throw new ApplicationError(code, translate()(`category.${problem}`));
}

export class CreateCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly translate: TranslateProvider,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(input: CategoryInput): Category {
    const category = { ...input, id: this.newId(), name: input.name.trim() };
    assertNameAvailable(this.categories, category, this.translate);
    this.categories.insert(category);
    return category;
  }
}

/** Renames and recolors; the type stays, since entries already rely on it. */
export class UpdateCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string, patch: CategoryPatch): Category {
    const current = this.categories.findById(id);
    if (!current) throw notFound(this.translate);
    const category = { ...current, color: patch.color, name: patch.name.trim() };
    assertNameAvailable(this.categories, category, this.translate);
    this.categories.update(category);
    return category;
  }
}

export class DeleteCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string): void {
    const category = this.categories.findById(id);
    if (!category) throw notFound(this.translate);
    const inUse = this.transactions.listAll().some((t) => t.categoryId === id);
    if (inUse) throw new ApplicationError('conflict', this.translate()('category.inUse', category.name));
    this.categories.delete(id);
  }
}
