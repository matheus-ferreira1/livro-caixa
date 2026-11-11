import {
  dateParts,
  type Category,
  type Localization,
  type MessageKey,
  type Transaction,
  type TransactionType,
} from '@livro-caixa/domain';

/** Label key, sign and color classes per entry type, as in the design. */
export const TYPE_META: Record<
  TransactionType,
  { labelKey: MessageKey; sign: '+' | '−'; text: string; bg: string; border: string }
> = {
  receita: {
    labelKey: 'transactions.type.receita',
    sign: '+',
    text: 'text-income',
    bg: 'bg-income-bg',
    border: 'border-income',
  },
  despesa: {
    labelKey: 'transactions.type.despesa',
    sign: '−',
    text: 'text-expense',
    bg: 'bg-expense-bg',
    border: 'border-expense',
  },
  acerto: {
    labelKey: 'transactions.type.acerto',
    sign: '+',
    text: 'text-settlement',
    bg: 'bg-settlement-bg',
    border: 'border-settlement',
  },
};

export const NEUTRAL_SWATCH = '#9AA29D';

export interface RowViewModel {
  id: string;
  day: string;
  weekday: string;
  description: string;
  note: string;
  recurring: boolean;
  categoryName: string;
  categoryColor: string;
  typeLabel: string;
  typeText: string;
  typeBg: string;
  valueLabel: string;
  canSplit: boolean;
  split: boolean;
  confirmed: boolean;
  statusLabel: string;
}

export function rowViewModel(
  transaction: Transaction,
  categories: Map<string, Category>,
  { withYear }: { withYear: boolean },
  { t, money }: Pick<Localization, 't' | 'money'>,
): RowViewModel {
  const parts = dateParts(transaction.date, t);
  const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined;
  const meta = TYPE_META[transaction.type];
  return {
    id: transaction.id,
    day: `${parts.dd}/${parts.mm}${withYear ? `/${parts.yy}` : ''}`,
    weekday: parts.weekday,
    description: transaction.description,
    note: transaction.note,
    recurring: transaction.recurring,
    categoryName: category?.name ?? (transaction.type === 'acerto' ? t(meta.labelKey) : t('category.none')),
    categoryColor: category?.color ?? NEUTRAL_SWATCH,
    typeLabel: t(meta.labelKey),
    typeText: meta.text,
    typeBg: meta.bg,
    valueLabel: `${meta.sign} ${money.format(transaction.valueCents)}`,
    canSplit: transaction.type === 'despesa',
    split: transaction.split,
    confirmed: transaction.confirmed,
    statusLabel: t(transaction.confirmed ? 'transactions.status.confirmed' : 'transactions.status.pending'),
  };
}

const collator = new Intl.Collator('pt-BR');

export function sortedCategoryChips(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => b.type.localeCompare(a.type) || collator.compare(a.name, b.name));
}
