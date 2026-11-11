import {
  dateParts,
  monthLabel,
  sumCents,
  validateRecurringSelection,
  type Category,
  type IsoDate,
  type Localization,
  type MoneyFormat,
  type MonthKey,
  type RecurringCandidate,
  type RecurringGenerateRequest,
  type TransactionType,
} from '@livro-caixa/domain';
import { TYPE_META } from '@/features/transactions/view-model';

/** What the review dialog holds per series: whether it is chosen, and the date and value as typed. */
export interface RecurringDraft {
  include: boolean;
  date: IsoDate;
  value: string;
}

export type RecurringDrafts = Record<string, RecurringDraft>;

const defaultDraft = (c: RecurringCandidate, money: MoneyFormat): RecurringDraft => ({
  include: true,
  date: c.date,
  value: money.toInput(c.valueCents),
});

export const defaultDrafts = (candidates: RecurringCandidate[], money: MoneyFormat): RecurringDrafts =>
  Object.fromEntries(candidates.map((c) => [c.seriesId, defaultDraft(c, money)]));

// A series can show up after the dialog opened (the list refetched); it starts with the defaults.
const draftOf = (c: RecurringCandidate, drafts: RecurringDrafts, money: MoneyFormat): RecurringDraft =>
  drafts[c.seriesId] ?? defaultDraft(c, money);

export const recurringBannerText = (count: number, month: MonthKey, { t }: Pick<Localization, 't'>): string =>
  t('recurring.banner', count, monthLabel(month, t));

export interface RecurringRow {
  seriesId: string;
  description: string;
  meta: string;
  type: TransactionType;
  typeLabel: string;
  include: boolean;
  date: IsoDate;
  value: string;
  lastLabel: string;
  includeLabel: string;
  dateLabel: string;
  valueLabel: string;
}

export function recurringRows(
  candidates: RecurringCandidate[],
  drafts: RecurringDrafts,
  categories: Map<string, Category>,
  { t, money }: Pick<Localization, 't' | 'money'>,
): RecurringRow[] {
  return candidates.map((c) => {
    const { description, categoryId, split, type, valueCents, date } = c.source;
    const category = categoryId ? categories.get(categoryId) : undefined;
    const { dd, mm } = dateParts(date, t);
    const draft = draftOf(c, drafts, money);
    return {
      seriesId: c.seriesId,
      description,
      meta: (category?.name ?? t('category.none')) + (split ? t('recurring.splitSuffix') : ''),
      type,
      typeLabel: t(TYPE_META[type].labelKey),
      include: draft.include,
      date: draft.date,
      value: draft.value,
      lastLabel: `${money.format(valueCents)} · ${dd}/${mm}`,
      includeLabel: t('recurring.includeRow', description),
      dateLabel: t('recurring.dateRow', description),
      valueLabel: t('recurring.valueRow', description),
    };
  });
}

const chosen = (candidates: RecurringCandidate[], drafts: RecurringDrafts, money: MoneyFormat) =>
  candidates
    .map((c) => ({ candidate: c, draft: draftOf(c, drafts, money) }))
    .filter(({ draft }) => draft.include);

export function recurringSummary(
  candidates: RecurringCandidate[],
  drafts: RecurringDrafts,
  { t, money }: Pick<Localization, 't' | 'money'>,
) {
  const selected = chosen(candidates, drafts, money);
  const totalOf = (type: TransactionType) =>
    money.format(
      sumCents(
        selected
          .filter(({ candidate }) => candidate.source.type === type)
          .map(({ draft }) => money.parse(draft.value) ?? 0),
      ),
    );
  const count = selected.length;
  return {
    selectionLabel: t('recurring.selected', count, candidates.length),
    income: totalOf('receita'),
    expense: totalOf('despesa'),
    allSelected: candidates.length > 0 && count === candidates.length,
    canGenerate: count > 0,
    generateLabel: count > 0 ? t('recurring.generate', count) : t('recurring.generateNone'),
  };
}

export function generateRequest(
  month: MonthKey,
  candidates: RecurringCandidate[],
  drafts: RecurringDrafts,
  { t, money }: Pick<Localization, 't' | 'money'>,
): { error: string } | { request: RecurringGenerateRequest } {
  const selected = chosen(candidates, drafts, money).map(({ candidate, draft }) => ({
    seriesId: candidate.seriesId,
    description: candidate.source.description,
    date: draft.date,
    valueCents: money.parse(draft.value),
  }));
  const error = validateRecurringSelection(selected, month, t);
  if (error) return { error };
  return {
    request: {
      month,
      // Validation guarantees every value parsed.
      items: selected.map(({ seriesId, date, valueCents }) => ({
        seriesId,
        date,
        valueCents: valueCents ?? 0,
      })),
    },
  };
}
