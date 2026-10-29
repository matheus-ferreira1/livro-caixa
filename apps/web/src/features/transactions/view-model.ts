import {
  dateParts,
  formatMoney,
  type Category,
  type Transaction,
  type TransactionType,
} from '@livro-caixa/domain';

/** Labels, sign and color classes per entry type, as in the design. */
export const TYPE_META: Record<
  TransactionType,
  { label: string; sign: '+' | '−'; text: string; bg: string; border: string }
> = {
  receita: { label: 'Receita', sign: '+', text: 'text-income', bg: 'bg-income-bg', border: 'border-income' },
  despesa: {
    label: 'Despesa',
    sign: '−',
    text: 'text-expense',
    bg: 'bg-expense-bg',
    border: 'border-expense',
  },
  acerto: {
    label: 'Acerto',
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
  statusLabel: 'Confirmado' | 'Previsto';
}

export function rowViewModel(
  t: Transaction,
  categories: Map<string, Category>,
  { withYear }: { withYear: boolean },
): RowViewModel {
  const parts = dateParts(t.date);
  const category = t.categoryId ? categories.get(t.categoryId) : undefined;
  const meta = TYPE_META[t.type];
  return {
    id: t.id,
    day: `${parts.dd}/${parts.mm}${withYear ? `/${parts.yy}` : ''}`,
    weekday: parts.weekday,
    description: t.description,
    note: t.note,
    recurring: t.recurring,
    categoryName: category?.name ?? (t.type === 'acerto' ? 'Acerto' : 'Sem categoria'),
    categoryColor: category?.color ?? NEUTRAL_SWATCH,
    typeLabel: meta.label,
    typeText: meta.text,
    typeBg: meta.bg,
    valueLabel: `${meta.sign} ${formatMoney(t.valueCents)}`,
    canSplit: t.type === 'despesa',
    split: t.split,
    confirmed: t.confirmed,
    statusLabel: t.confirmed ? 'Confirmado' : 'Previsto',
  };
}

const collator = new Intl.Collator('pt-BR');

export function sortedCategoryChips(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => b.type.localeCompare(a.type) || collator.compare(a.name, b.name));
}

export const pluralize = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;
