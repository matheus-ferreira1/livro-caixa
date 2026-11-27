import {
  DEFAULT_LOCALIZATION as pt,
  localization,
  MONTHLY_RECURRENCE,
  weeklyRecurrence,
  type Category,
  type RecurringCandidate,
  type Transaction,
} from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import {
  defaultDrafts,
  generateRequest,
  recurringBannerHelp,
  recurringBannerText,
  recurringRows,
  recurringSummary,
  withDateChecked,
  withSeriesChecked,
  type RecurringDrafts,
} from './view-model';

const categories = new Map<string, Category>([
  ['c-internet', { id: 'c-internet', name: 'Internet', type: 'despesa', color: '#6250D6' }],
]);

const source = (overrides: Partial<Transaction>): Transaction => ({
  id: 'src',
  date: '2026-10-15',
  description: 'Internet fibra',
  note: '',
  type: 'despesa',
  categoryId: 'c-internet',
  valueCents: 11_990,
  split: true,
  confirmed: true,
  recurring: true,
  seriesId: 's-net',
  recurrence: MONTHLY_RECURRENCE,
  ...overrides,
});

const candidate = (overrides: Partial<Transaction>, date = '2026-11-15'): RecurringCandidate => {
  const s = source(overrides);
  return { seriesId: s.seriesId ?? '', date, valueCents: s.valueCents, source: s };
};

const CANDIDATES = [
  candidate({}),
  candidate(
    {
      seriesId: 's-sal',
      description: 'Salário',
      type: 'receita',
      categoryId: null,
      valueCents: 850_000,
      split: false,
    },
    '2026-11-05',
  ),
];

// Intl puts a no-break space after the currency symbol.
const money = (text: string) => text.replaceAll('R$ ', 'R$ ');

describe('recurringBannerText', () => {
  test('agrees in number with the count', () => {
    expect(recurringBannerText(1, '2026-11', pt)).toBe(
      '1 lançamento recorrente ainda não foi gerado para Novembro 2026.',
    );
    expect(recurringBannerText(3, '2026-11', pt)).toBe(
      '3 lançamentos recorrentes ainda não foram gerados para Novembro 2026.',
    );
  });
});

describe('recurringRows', () => {
  test('starts every row selected with the suggested date and value', () => {
    const [row] = recurringRows(CANDIDATES, defaultDrafts(CANDIDATES, pt.money), categories, pt);
    expect(row).toMatchObject({
      seriesId: 's-net',
      description: 'Internet fibra',
      meta: 'Internet · dividida',
      typeLabel: 'Despesa',
      include: true,
      date: '2026-11-15',
      value: '119,90',
      lastLabel: money('R$ 119,90 · 15/10'),
      includeLabel: 'Incluir Internet fibra',
      dateLabel: 'Data de Internet fibra',
      valueLabel: 'Valor de Internet fibra',
    });
  });

  test('shows "Sem categoria" when the source has none', () => {
    expect(recurringRows(CANDIDATES, defaultDrafts(CANDIDATES, pt.money), categories, pt)[1]?.meta).toBe(
      'Sem categoria',
    );
  });
});

describe('recurringSummary', () => {
  test('counts and totals the selected rows by type', () => {
    const summary = recurringSummary(CANDIDATES, defaultDrafts(CANDIDATES, pt.money), pt);
    expect(summary).toEqual({
      selectionLabel: '2 de 2 selecionados',
      income: money('R$ 8.500,00'),
      expense: money('R$ 119,90'),
      allSelected: true,
      canGenerate: true,
      generateLabel: 'Gerar 2 lançamentos',
    });
  });

  test('leaves out unselected rows and unparseable values', () => {
    const drafts: RecurringDrafts = {
      ...defaultDrafts(CANDIDATES, pt.money),
      's-sal': { include: false, date: '2026-11-05', value: '8500', skipped: [] },
      's-net': { include: true, date: '2026-11-15', value: 'abc', skipped: [] },
    };
    expect(recurringSummary(CANDIDATES, drafts, pt)).toMatchObject({
      selectionLabel: '1 de 2 selecionados',
      income: money('R$ 0,00'),
      expense: money('R$ 0,00'),
      allSelected: false,
      generateLabel: 'Gerar 1 lançamento',
    });
  });

  test('cannot generate when nothing is selected', () => {
    const drafts = Object.fromEntries(
      Object.entries(defaultDrafts(CANDIDATES, pt.money)).map(([id, d]) => [id, { ...d, include: false }]),
    );
    expect(recurringSummary(CANDIDATES, drafts, pt)).toMatchObject({
      canGenerate: false,
      generateLabel: 'Gerar lançamentos',
    });
  });
});

describe('generateRequest', () => {
  test('sends the selected rows with their reviewed date and value in cents', () => {
    const drafts = {
      ...defaultDrafts(CANDIDATES, pt.money),
      's-net': { include: true, date: '2026-11-20', value: '1.234,56', skipped: [] },
    };
    expect(generateRequest('2026-11', CANDIDATES, drafts, pt)).toEqual({
      request: {
        month: '2026-11',
        items: [
          { seriesId: 's-net', date: '2026-11-20', valueCents: 123_456 },
          { seriesId: 's-sal', date: '2026-11-05', valueCents: 850_000 },
        ],
      },
    });
  });

  test('names the first row to review', () => {
    const drafts = {
      ...defaultDrafts(CANDIDATES, pt.money),
      's-net': { include: true, date: '2026-12-01', value: '10', skipped: [] },
    };
    expect(generateRequest('2026-11', CANDIDATES, drafts, pt)).toEqual({
      error: 'Revise “Internet fibra”: a data deve ser em Novembro 2026 e o valor maior que zero.',
    });
  });
});

describe('recurring view models in English with US dollars', () => {
  const english = localization('en', 'USD');

  test('words the banner and the rows in English', () => {
    expect(recurringBannerText(3, '2026-11', english)).toBe(
      '3 recurring entries have not been generated yet for November 2026.',
    );
    const [row] = recurringRows(CANDIDATES, defaultDrafts(CANDIDATES, english.money), categories, english);
    expect(row).toMatchObject({
      meta: 'Internet · split',
      typeLabel: 'Expense',
      value: '119.90',
      lastLabel: '$119.90 · 15/10',
      includeLabel: 'Include Internet fibra',
    });
  });

  test('reads typed amounts with a dot as the decimal mark', () => {
    const drafts = {
      ...defaultDrafts(CANDIDATES, english.money),
      's-net': { include: true, date: '2026-11-20', value: '1,234.56', skipped: [] },
    };
    expect(generateRequest('2026-11', CANDIDATES, drafts, english)).toMatchObject({
      request: { items: [{ seriesId: 's-net', valueCents: 123_456 }, { seriesId: 's-sal' }] },
    });
    expect(recurringSummary(CANDIDATES, drafts, english)).toMatchObject({
      selectionLabel: '2 of 2 selected',
      generateLabel: 'Generate 2 entries',
    });
  });
});

const weeklyCandidates = ['2026-11-02', '2026-11-09', '2026-11-16'].map((date) =>
  candidate(
    {
      seriesId: 's-clean',
      description: 'Faxina',
      valueCents: 20_000,
      split: false,
      recurrence: weeklyRecurrence([1]),
    },
    date,
  ),
);
const MIXED = [...CANDIDATES, ...weeklyCandidates];

describe('weekly series', () => {
  test('are one row with a checkbox per date, labelled by weekday', () => {
    const rows = recurringRows(MIXED, defaultDrafts(MIXED, pt.money), categories, pt);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({
      weekly: true,
      include: true,
      occurrencesLabel: '3 ocorrências',
      value: '200,00',
      dates: [
        { date: '2026-11-02', label: 'seg 02/11', checked: true },
        { date: '2026-11-09', label: 'seg 09/11', checked: true },
        { date: '2026-11-16', label: 'seg 16/11', checked: true },
      ],
    });
    expect(rows[0]?.weekly).toBe(false);
  });

  test('count occurrences, not rows, in the summary and the request', () => {
    const drafts = defaultDrafts(MIXED, pt.money);
    expect(recurringSummary(MIXED, drafts, pt)).toMatchObject({
      selectionLabel: '5 de 5 selecionados',
      expense: money('R$ 719,90'),
      generateLabel: 'Gerar 5 lançamentos',
    });
    expect(generateRequest('2026-11', MIXED, drafts, pt)).toMatchObject({
      request: {
        items: expect.arrayContaining([
          { seriesId: 's-clean', date: '2026-11-02', valueCents: 20_000 },
          { seriesId: 's-clean', date: '2026-11-16', valueCents: 20_000 },
        ]),
      },
    });
  });

  test('skip unchecked dates and unselect the row once none is left', () => {
    const [row] = recurringRows(weeklyCandidates, defaultDrafts(weeklyCandidates, pt.money), categories, pt);
    const base = defaultDrafts(weeklyCandidates, pt.money)['s-clean'];
    if (!row || !base) throw new Error('fixture');
    const some = withDateChecked(base, '2026-11-09', false);
    expect(recurringSummary(weeklyCandidates, { 's-clean': some }, pt).selectionLabel).toBe(
      '2 de 3 selecionados',
    );
    const none = withSeriesChecked(row, base, false);
    const [cleared] = recurringRows(weeklyCandidates, { 's-clean': none }, categories, pt);
    expect(cleared?.include).toBe(false);
    expect(withSeriesChecked(row, none, true).skipped).toEqual([]);
  });

  test('use the weekly banner sub-line only when a candidate is weekly', () => {
    expect(recurringBannerHelp(CANDIDATES, pt)).toBe(pt.t('recurring.bannerHelp'));
    expect(recurringBannerHelp(MIXED, pt)).toBe(pt.t('recurring.bannerSublineWeekly'));
  });
});
