import {
  dateParts,
  formatMoney,
  monthLabel,
  parseMoney,
  sumCents,
  toMoneyInput,
  validateRecurringSelection,
  type Category,
  type IsoDate,
  type MonthKey,
  type RecurringCandidate,
  type RecurringGenerateRequest,
  type TransactionType,
} from '@livro-caixa/domain';
import { pluralize } from '@/shared/lib/utils';
import { TYPE_META } from '@/features/transactions/view-model';

/** What the review dialog holds per series: whether it is chosen, and the date and value as typed. */
export interface RecurringDraft {
  include: boolean;
  date: IsoDate;
  value: string;
}

export type RecurringDrafts = Record<string, RecurringDraft>;

const defaultDraft = (c: RecurringCandidate): RecurringDraft => ({
  include: true,
  date: c.date,
  value: toMoneyInput(c.valueCents),
});

export const defaultDrafts = (candidates: RecurringCandidate[]): RecurringDrafts =>
  Object.fromEntries(candidates.map((c) => [c.seriesId, defaultDraft(c)]));

// A series can show up after the dialog opened (the list refetched); it starts with the defaults.
const draftOf = (c: RecurringCandidate, drafts: RecurringDrafts): RecurringDraft =>
  drafts[c.seriesId] ?? defaultDraft(c);

export function recurringBannerText(count: number, month: MonthKey): string {
  const pending =
    count === 1
      ? '1 lançamento recorrente ainda não foi gerado'
      : `${count} lançamentos recorrentes ainda não foram gerados`;
  return `${pending} para ${monthLabel(month)}.`;
}

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
): RecurringRow[] {
  return candidates.map((c) => {
    const { description, categoryId, split, type, valueCents, date } = c.source;
    const category = categoryId ? categories.get(categoryId) : undefined;
    const { dd, mm } = dateParts(date);
    const draft = draftOf(c, drafts);
    return {
      seriesId: c.seriesId,
      description,
      meta: (category?.name ?? 'Sem categoria') + (split ? ' · dividida' : ''),
      type,
      typeLabel: TYPE_META[type].label,
      include: draft.include,
      date: draft.date,
      value: draft.value,
      lastLabel: `${formatMoney(valueCents)} · ${dd}/${mm}`,
      includeLabel: `Incluir ${description}`,
      dateLabel: `Data de ${description}`,
      valueLabel: `Valor de ${description}`,
    };
  });
}

const chosen = (candidates: RecurringCandidate[], drafts: RecurringDrafts) =>
  candidates.map((c) => ({ candidate: c, draft: draftOf(c, drafts) })).filter(({ draft }) => draft.include);

export function recurringSummary(candidates: RecurringCandidate[], drafts: RecurringDrafts) {
  const selected = chosen(candidates, drafts);
  const totalOf = (type: TransactionType) =>
    formatMoney(
      sumCents(
        selected
          .filter(({ candidate }) => candidate.source.type === type)
          .map(({ draft }) => parseMoney(draft.value) ?? 0),
      ),
    );
  const count = selected.length;
  return {
    selectionLabel: `${count} de ${candidates.length} selecionados`,
    income: totalOf('receita'),
    expense: totalOf('despesa'),
    allSelected: candidates.length > 0 && count === candidates.length,
    canGenerate: count > 0,
    generateLabel: count > 0 ? `Gerar ${pluralize(count, 'lançamento', 'lançamentos')}` : 'Gerar lançamentos',
  };
}

export function generateRequest(
  month: MonthKey,
  candidates: RecurringCandidate[],
  drafts: RecurringDrafts,
): { error: string } | { request: RecurringGenerateRequest } {
  const selected = chosen(candidates, drafts).map(({ candidate, draft }) => ({
    seriesId: candidate.seriesId,
    description: candidate.source.description,
    date: draft.date,
    valueCents: parseMoney(draft.value),
  }));
  const error = validateRecurringSelection(selected, month);
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
