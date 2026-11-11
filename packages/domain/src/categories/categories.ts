import { z } from 'zod';
import type { Translate } from '../i18n/translate';
import type { Category, Transaction } from '../transactions/transaction';

export type CategoryType = Category['type'];
export const CATEGORY_TYPES = ['receita', 'despesa'] as const satisfies readonly CategoryType[];

/** Color-vision-deficiency-safe order from the design; new categories pick from these. */
export const CATEGORY_PALETTE = [
  '#2A78D6',
  '#EB6834',
  '#1BAF7A',
  '#EDA100',
  '#E87BA4',
  '#008300',
  '#6250D6',
  '#E34948',
] as const;

export type CategoryColor = (typeof CATEGORY_PALETTE)[number];

const isPaletteColor = (color: string): color is CategoryColor =>
  (CATEGORY_PALETTE as readonly string[]).includes(color);

/** Older or hand-edited rows may hold any color; editing starts from a palette one. */
export const toPaletteColor = (color: string): CategoryColor =>
  isPaletteColor(color) ? color : CATEGORY_PALETTE[0];

const MAX_CATEGORY_NAME_LENGTH = 60;

const categoryName = z.string().max(MAX_CATEGORY_NAME_LENGTH);
const categoryColor = z.enum(CATEGORY_PALETTE);

export const categoryInputSchema = z.object({
  name: categoryName,
  type: z.enum(CATEGORY_TYPES),
  color: categoryColor,
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** The type is fixed once created, so a patch carries only name and color. */
export const categoryPatchSchema = z.object({ name: categoryName, color: categoryColor }).strict();
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;

const sameName = (a: string, b: string) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

export type CategoryNameProblem = 'nameRequired' | 'duplicate';

/** What is wrong with the name, or null when it is usable for that type. */
export function categoryNameProblem(
  name: string,
  type: CategoryType,
  existing: readonly Category[],
  excludeId?: string,
): CategoryNameProblem | null {
  const trimmed = name.trim();
  if (!trimmed) return 'nameRequired';
  const duplicate = existing.some((c) => c.id !== excludeId && c.type === type && sameName(c.name, trimmed));
  return duplicate ? 'duplicate' : null;
}

/** Returns the first error message, or null when the name is usable for that type. */
export function validateCategoryName(
  name: string,
  type: CategoryType,
  existing: readonly Category[],
  t: Translate,
  excludeId?: string,
): string | null {
  const problem = categoryNameProblem(name, type, existing, excludeId);
  return problem ? t(`category.${problem}`) : null;
}

export type CategoryUsage = Record<string, number>;

export function categoryUsageCounts(transactions: readonly Pick<Transaction, 'categoryId'>[]): CategoryUsage {
  const usage: CategoryUsage = {};
  for (const { categoryId } of transactions) {
    if (categoryId) usage[categoryId] = (usage[categoryId] ?? 0) + 1;
  }
  return usage;
}

const collator = new Intl.Collator('pt-BR');

export const categoriesOfType = (categories: readonly Category[], type: CategoryType): Category[] =>
  categories.filter((c) => c.type === type).sort((a, b) => collator.compare(a.name, b.name));
