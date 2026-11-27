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
// Weekly rows ignore `include` and `date`: each date is chosen through `skipped` and keeps its planned date.
export interface RecurringDraft {
  include: boolean;
  date: IsoDate;
  value: string;
  /** Weekly series only: the dates left unchecked. Each date of the series is checked by default. */
  skipped: IsoDate[];
}

export type RecurringDrafts = Record<string, RecurringDraft>;

const defaultDraft = (c: RecurringCandidate, money: MoneyFormat): RecurringDraft => ({
  include: true,
  date: c.date,
  value: money.toInput(c.valueCents),
  skipped: [],
});

export const defaultDrafts = (candidates: RecurringCandidate[], money: MoneyFormat): RecurringDrafts =>
  Object.fromEntries(candidates.map((c) => [c.seriesId, defaultDraft(c, money)]));

const isWeekly = (c: RecurringCandidate): boolean => c.source.recurrence.frequency === 'weekly';

/** A weekly series arrives as one candidate per date, so the dialog works on series, not candidates. */
interface Series {
  seriesId: string;
  first: RecurringCandidate;
  candidates: RecurringCandidate[];
}

const groupBySeries = (candidates: RecurringCandidate[]): Series[] => {
  const bySeries = new Map<string, Series>();
  for (const c of candidates) {
    const series = bySeries.get(c.seriesId);
    if (series) series.candidates.push(c);
    else bySeries.set(c.seriesId, { seriesId: c.seriesId, first: c, candidates: [c] });
  }
  return [...bySeries.values()];
};

/** The dates of a series that are chosen: a monthly one is all or nothing, a weekly one date by date. */
const chosenCandidates = (series: Series, draft: RecurringDraft): RecurringCandidate[] =>
  isWeekly(series.first)
    ? series.candidates.filter((c) => !draft.skipped.includes(c.date))
    : draft.include
      ? series.candidates
      : [];

// A series can show up after the dialog opened (the list refetched); it starts with the defaults.
const draftOf = (c: RecurringCandidate, drafts: RecurringDrafts, money: MoneyFormat): RecurringDraft =>
  drafts[c.seriesId] ?? defaultDraft(c, money);

export const recurringBannerText = (count: number, month: MonthKey, { t }: Pick<Localization, 't'>): string =>
  t('recurring.banner', count, monthLabel(month, t));

export const recurringBannerHelp = (
  candidates: RecurringCandidate[],
  { t }: Pick<Localization, 't'>,
): string => t(candidates.some(isWeekly) ? 'recurring.bannerSublineWeekly' : 'recurring.bannerHelp');

export interface RecurringDateOption {
  date: IsoDate;
  label: string;
  checked: boolean;
}

export interface RecurringRow {
  seriesId: string;
  description: string;
  meta: string;
  type: TransactionType;
  typeLabel: string;
  include: boolean;
  weekly: boolean;
  date: IsoDate;
  value: string;
  lastLabel: string;
  includeLabel: string;
  dateLabel: string;
  valueLabel: string;
  occurrencesLabel: string;
  dates: RecurringDateOption[];
}

export function recurringRows(
  candidates: RecurringCandidate[],
  drafts: RecurringDrafts,
  categories: Map<string, Category>,
  { t, money }: Pick<Localization, 't' | 'money'>,
): RecurringRow[] {
  return groupBySeries(candidates).map((series) => {
    const { first } = series;
    const { description, categoryId, split, type, valueCents, date } = first.source;
    const category = categoryId ? categories.get(categoryId) : undefined;
    const { dd, mm } = dateParts(date, t);
    const draft = draftOf(first, drafts, money);
    const weekly = isWeekly(first);
    return {
      seriesId: series.seriesId,
      description,
      meta: (category?.name ?? t('category.none')) + (split ? t('recurring.splitSuffix') : ''),
      type,
      typeLabel: t(TYPE_META[type].labelKey),
      include: chosenCandidates(series, draft).length > 0,
      weekly,
      date: draft.date,
      value: draft.value,
      lastLabel: `${money.format(valueCents)} · ${dd}/${mm}`,
      includeLabel: t('recurring.includeRow', description),
      dateLabel: t('recurring.dateRow', description),
      valueLabel: t('recurring.valueRow', description),
      occurrencesLabel: t('recurring.occurrences', series.candidates.length),
      dates: weekly
        ? series.candidates.map((c) => ({
            date: c.date,
            label: dateLabel(c.date, t),
            checked: !draft.skipped.includes(c.date),
          }))
        : [],
    };
  });
}

const dateLabel = (date: IsoDate, t: Localization['t']): string => {
  const { dd, mm, weekday } = dateParts(date, t);
  return `${weekday} ${dd}/${mm}`;
};

/** The draft after (un)checking a whole series: a weekly one checks or clears every date. */
export const withSeriesChecked = (
  row: RecurringRow,
  draft: RecurringDraft,
  checked: boolean,
): RecurringDraft => ({
  ...draft,
  include: checked,
  skipped: checked ? [] : row.dates.map((d) => d.date),
});

export const withDateChecked = (draft: RecurringDraft, date: IsoDate, checked: boolean): RecurringDraft => ({
  ...draft,
  skipped: checked ? draft.skipped.filter((d) => d !== date) : [...draft.skipped, date],
});

const chosen = (candidates: RecurringCandidate[], drafts: RecurringDrafts, money: MoneyFormat) =>
  groupBySeries(candidates).flatMap((series) => {
    const draft = draftOf(series.first, drafts, money);
    return chosenCandidates(series, draft).map((candidate) => ({
      candidate,
      // A weekly date is not editable, so each occurrence keeps its planned date.
      draft: isWeekly(candidate) ? { ...draft, date: candidate.date } : draft,
    }));
  });

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
