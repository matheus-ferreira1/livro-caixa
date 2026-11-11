import { z } from 'zod';
import { defaultDateForMonth, isIsoDate, type IsoDate, type MonthKey } from '../dates/dates';
import type { Localization } from '../i18n/localization';
import type { Translate } from '../i18n/translate';
import type { Cents, MoneyFormat } from '../money/money';
import { TRANSACTION_TYPES, type Category, type Transaction, type TransactionType } from './transaction';

/** What the Novo/Editar lançamento form holds: the value is still the text being typed. */
export interface TransactionDraft {
  date: IsoDate;
  description: string;
  note: string;
  type: TransactionType;
  categoryId: string | null;
  value: string;
  split: boolean;
  confirmed: boolean;
  recurring: boolean;
}

/**
 * 1 billion in the currency. No household entry comes near it, and it keeps totals exact: a ledger far
 * larger than any household's still adds up below Number.MAX_SAFE_INTEGER.
 */
export const MAX_ENTRY_CENTS = 100_000_000_000;

/** What the API accepts to create or replace an entry. */
export const transactionInputSchema = z.object({
  date: z.string(),
  description: z.string().max(200),
  note: z.string().max(500).default(''),
  type: z.enum(TRANSACTION_TYPES),
  categoryId: z.string().nullable(),
  valueCents: z.number().int().max(MAX_ENTRY_CENTS),
  split: z.boolean(),
  confirmed: z.boolean(),
  recurring: z.boolean(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

const firstCategoryId = (categories: Category[], type: TransactionType): string | null =>
  categories.find((c) => c.type === type)?.id ?? null;

export function emptyDraft(month: MonthKey, today: IsoDate, categories: Category[]): TransactionDraft {
  return {
    date: defaultDateForMonth(month, today),
    description: '',
    note: '',
    type: 'despesa',
    categoryId: firstCategoryId(categories, 'despesa'),
    value: '',
    split: false,
    confirmed: false,
    recurring: false,
  };
}

export function draftFromTransaction(t: Transaction, money: MoneyFormat): TransactionDraft {
  return {
    date: t.date,
    description: t.description,
    note: t.note,
    type: t.type,
    categoryId: t.categoryId,
    value: money.toInput(t.valueCents),
    split: t.split,
    confirmed: t.confirmed,
    recurring: t.recurring,
  };
}

/** Switching type resets the category to the first one of that type; only expenses stay split. */
export function applyTypeChange(
  draft: TransactionDraft,
  type: TransactionType,
  categories: Category[],
): TransactionDraft {
  return {
    ...draft,
    type,
    categoryId: firstCategoryId(categories, type),
    split: type === 'despesa' ? draft.split : false,
  };
}

/** Returns the first problem in the order the design lists them, or null. */
export function validateInput(
  input: Omit<TransactionInput, 'valueCents'> & { valueCents: Cents | null },
  t: Translate,
): string | null {
  if (!isIsoDate(input.date)) return t('form.date');
  if (!input.description.trim()) return t('form.description');
  if (input.valueCents === null || input.valueCents <= 0) return t('form.value');
  if (input.type !== 'acerto' && !input.categoryId) return t('form.category');
  return null;
}

export function draftToInput(
  draft: TransactionDraft,
  { money, t }: Pick<Localization, 'money' | 't'>,
): { input: TransactionInput } | { error: string } {
  const valueCents = money.parse(draft.value);
  const fields = {
    date: draft.date,
    description: draft.description.trim(),
    note: draft.note.trim(),
    type: draft.type,
    categoryId: draft.categoryId,
    split: draft.split,
    confirmed: draft.confirmed,
    recurring: draft.recurring,
  };
  const error = validateInput({ ...fields, valueCents }, t);
  if (error || valueCents === null) return { error: error ?? t('form.value') };
  return { input: { ...fields, valueCents } };
}

/**
 * Applies the entry rules: an acerto has no category, split or recurrence; only expenses
 * can be split; a recurring entry belongs to a series, and an edit keeps its series even
 * when recurrence is switched off so the history stays linked.
 */
export function toTransaction(
  id: string,
  input: TransactionInput,
  existing: Transaction | null,
): Transaction {
  const isSettlement = input.type === 'acerto';
  const recurring = !isSettlement && input.recurring;
  return {
    id,
    date: input.date,
    description: input.description.trim(),
    note: input.note.trim(),
    type: input.type,
    categoryId: isSettlement ? null : input.categoryId,
    valueCents: input.valueCents,
    split: input.type === 'despesa' && input.split,
    confirmed: input.confirmed,
    recurring,
    seriesId: existing?.seriesId ?? (recurring ? `s-${id}` : null),
  };
}
