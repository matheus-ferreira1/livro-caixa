import { describe, expect, test } from 'bun:test';
import { localization } from '../i18n/localization';
import { aTransaction } from '../test/builders';
import {
  MAX_ENTRY_CENTS,
  applyFrequencyChange,
  applyTypeChange,
  toggleWeekday,
  draftFromTransaction,
  draftToInput,
  emptyDraft,
  toTransaction,
  transactionInputSchema,
  validateInput,
  type TransactionDraft,
} from './transaction-input';

const l10n = localization('pt-BR', 'BRL');

const categories = [
  { id: 'c-salario', name: 'Salário', type: 'receita' as const, color: '#2A78D6' },
  { id: 'c-moradia', name: 'Moradia', type: 'despesa' as const, color: '#EB6834' },
];

const valid: TransactionDraft = {
  date: '2026-11-06',
  description: '  Conserto do chuveiro ',
  note: ' Eletricista ',
  type: 'despesa',
  categoryId: 'c-moradia',
  value: '180,00',
  split: true,
  confirmed: false,
  recurring: false,
  frequency: 'monthly',
  weekdays: [],
};

describe('emptyDraft', () => {
  test('defaults to an unconfirmed expense in the first expense category', () => {
    expect(emptyDraft('2026-11', '2026-10-29', categories)).toEqual({
      date: '2026-11-01',
      description: '',
      note: '',
      type: 'despesa',
      categoryId: 'c-moradia',
      value: '',
      split: false,
      confirmed: false,
      recurring: false,
      frequency: 'monthly',
      weekdays: [],
    });
  });
});

describe('applyFrequencyChange', () => {
  test('switching to weekly pre-selects the weekday of the date', () => {
    expect(applyFrequencyChange({ ...valid, date: '2026-11-06' }, 'weekly')).toMatchObject({
      frequency: 'weekly',
      weekdays: [5],
    });
  });

  test('re-selecting weekly keeps the chosen weekdays', () => {
    const weekly: TransactionDraft = { ...valid, frequency: 'weekly', weekdays: [1, 5] };
    expect(applyFrequencyChange(weekly, 'weekly').weekdays).toEqual([1, 5]);
  });

  test('pre-selects nothing while the date is not a real day', () => {
    expect(applyFrequencyChange({ ...valid, date: '' }, 'weekly').weekdays).toEqual([]);
  });

  test('switching back to monthly clears the weekdays', () => {
    const weekly = { ...valid, frequency: 'weekly' as const, weekdays: [1, 5] as const };
    expect(applyFrequencyChange({ ...weekly, weekdays: [...weekly.weekdays] }, 'monthly')).toMatchObject({
      frequency: 'monthly',
      weekdays: [],
    });
  });
});

describe('toggleWeekday', () => {
  test('adds a weekday in calendar order and removes it on the second press', () => {
    const draft = { ...valid, frequency: 'weekly' as const, weekdays: [5 as const] };
    const added = toggleWeekday(draft, 1);
    expect(added.weekdays).toEqual([1, 5]);
    expect(toggleWeekday(added, 5).weekdays).toEqual([1]);
  });
});

describe('applyTypeChange', () => {
  test('picks the first category of the new type and drops split for non-expenses', () => {
    expect(applyTypeChange(valid, 'receita', categories)).toMatchObject({
      type: 'receita',
      categoryId: 'c-salario',
      split: false,
    });
    expect(applyTypeChange(valid, 'acerto', categories)).toMatchObject({ categoryId: null, split: false });
  });

  test('an acerto never keeps a weekly frequency', () => {
    const weekly: TransactionDraft = { ...valid, recurring: true, frequency: 'weekly', weekdays: [1] };
    expect(applyTypeChange(weekly, 'acerto', categories)).toMatchObject({
      frequency: 'monthly',
      weekdays: [],
    });
    expect(applyTypeChange(weekly, 'receita', categories)).toMatchObject({
      frequency: 'weekly',
      weekdays: [1],
    });
  });

  test('keeps split when staying on expense', () => {
    expect(applyTypeChange(valid, 'despesa', categories).split).toBe(true);
  });
});

describe('draftToInput + validateInput', () => {
  const check = (patch: Partial<TransactionDraft>) => {
    const result = draftToInput({ ...valid, ...patch }, l10n);
    return 'error' in result ? result.error : validateInput(result.input, l10n.t);
  };

  test('reports the first problem, in the design order', () => {
    expect(check({ date: '', description: '' })).toBe(l10n.t('form.date'));
    expect(check({ description: '   ' })).toBe(l10n.t('form.description'));
    expect(check({ value: '0' })).toBe(l10n.t('form.value'));
    expect(check({ value: 'abc' })).toBe(l10n.t('form.value'));
    expect(check({ categoryId: null })).toBe(l10n.t('form.category'));
    expect(check({ type: 'acerto', categoryId: null })).toBeNull();
  });

  test('asks for a weekday after the category, only for a weekly recurring entry', () => {
    const weeklyWithoutDays = { recurring: true, frequency: 'weekly' as const, weekdays: [] };
    expect(check({ ...weeklyWithoutDays, categoryId: null })).toBe(l10n.t('form.category'));
    expect(check(weeklyWithoutDays)).toBe('Escolha ao menos um dia da semana.');
    expect(check({ ...weeklyWithoutDays, weekdays: [1] })).toBeNull();
    expect(check({ ...weeklyWithoutDays, recurring: false })).toBeNull();
  });

  test('sends the weekly recurrence with the weekdays sorted', () => {
    const result = draftToInput({ ...valid, recurring: true, frequency: 'weekly', weekdays: [5, 1] }, l10n);
    expect(result).toMatchObject({ input: { recurrence: { frequency: 'weekly', weekdays: [1, 5] } } });
  });

  test.each([
    { recurring: false, type: 'despesa' as const },
    { recurring: true, type: 'acerto' as const, categoryId: null },
  ])('sends a monthly recurrence for %p', (patch) => {
    const result = draftToInput({ ...valid, frequency: 'weekly', weekdays: [1], ...patch }, l10n);
    expect(result).toMatchObject({ input: { recurrence: { frequency: 'monthly' } } });
  });

  test('normalizes a valid draft', () => {
    const result = draftToInput(valid, l10n);
    expect(result).toEqual({
      input: {
        date: '2026-11-06',
        description: 'Conserto do chuveiro',
        note: 'Eletricista',
        type: 'despesa',
        categoryId: 'c-moradia',
        valueCents: 18_000,
        split: true,
        confirmed: false,
        recurring: false,
        recurrence: { frequency: 'monthly' },
      },
    });
  });
});

describe('toTransaction', () => {
  const input = (overrides = {}) => {
    const result = draftToInput({ ...valid, ...overrides }, l10n);
    if ('error' in result) throw new Error(result.error);
    return result.input;
  };

  test('an acerto never has category, split or recurrence', () => {
    const t = toTransaction('n1', input({ type: 'acerto', categoryId: 'c-moradia', recurring: true }), null);
    expect(t).toMatchObject({ categoryId: null, split: false, recurring: false, seriesId: null });
  });

  test('only expenses keep split', () => {
    expect(toTransaction('n1', input({ type: 'receita', categoryId: 'c-salario' }), null).split).toBe(false);
  });

  test('a new recurring entry starts its own series', () => {
    expect(toTransaction('n1', input({ recurring: true }), null).seriesId).toBe('s-n1');
  });

  test('stores a weekly recurrence with its weekdays', () => {
    const t = toTransaction('n1', input({ recurring: true, frequency: 'weekly', weekdays: [5, 1] }), null);
    expect(t).toMatchObject({
      recurring: true,
      seriesId: 's-n1',
      recurrence: { frequency: 'weekly', weekdays: [1, 5] },
    });
  });

  test('a non-recurring entry or an acerto is stored as monthly', () => {
    const weekly = { recurrence: { frequency: 'weekly' as const, weekdays: [1 as const] } };
    expect(toTransaction('n1', { ...input(), ...weekly }, null).recurrence).toEqual({ frequency: 'monthly' });
    const settlement = { ...input({ type: 'acerto', categoryId: null, recurring: true }), ...weekly };
    expect(toTransaction('n1', settlement, null).recurrence).toEqual({ frequency: 'monthly' });
  });

  test('a replace without a recurrence keeps the existing weekly one', () => {
    const weekly = { frequency: 'weekly' as const, weekdays: [2 as const] };
    const existing = aTransaction({ id: 'old', recurring: true, seriesId: 's-old', recurrence: weekly });
    const withoutRecurrence = { ...input({ recurring: true }), recurrence: undefined };
    expect(toTransaction('old', withoutRecurrence, existing).recurrence).toEqual(weekly);
  });

  test('a create without a recurrence is monthly', () => {
    const withoutRecurrence = { ...input({ recurring: true }), recurrence: undefined };
    expect(toTransaction('n1', withoutRecurrence, null).recurrence).toEqual({ frequency: 'monthly' });
  });

  test('a replace that turns recurring off becomes monthly', () => {
    const weekly = { frequency: 'weekly' as const, weekdays: [2 as const] };
    const existing = aTransaction({ id: 'old', recurring: true, seriesId: 's-old', recurrence: weekly });
    const withoutRecurrence = { ...input({ recurring: false }), recurrence: undefined };
    expect(toTransaction('old', withoutRecurrence, existing).recurrence).toEqual({ frequency: 'monthly' });
  });

  test('editing keeps the series even when recurrence is switched off', () => {
    const existing = aTransaction({ id: 'old', recurring: true, seriesId: 's-luz' });
    const t = toTransaction('old', input({ recurring: false }), existing);
    expect(t).toMatchObject({ id: 'old', recurring: false, seriesId: 's-luz' });
  });
});

describe('draftFromTransaction', () => {
  test('prefills the edit form', () => {
    const t = aTransaction({ valueCents: 18_000, note: 'x', recurring: true });
    expect(draftFromTransaction(t, l10n.money)).toMatchObject({
      value: '180,00',
      note: 'x',
      recurring: true,
      categoryId: t.categoryId,
      frequency: 'monthly',
      weekdays: [],
    });
  });

  test('prefills the weekly frequency and its weekdays', () => {
    const t = aTransaction({ recurring: true, recurrence: { frequency: 'weekly', weekdays: [1, 5] } });
    expect(draftFromTransaction(t, l10n.money)).toMatchObject({ frequency: 'weekly', weekdays: [1, 5] });
  });
});

describe('transactionInputSchema', () => {
  const input = { ...aTransaction(), note: '' };

  test('accepts an amount in whole cents', () => {
    expect(transactionInputSchema.safeParse(input).success).toBe(true);
  });

  test('accepts the largest amount an entry may have', () => {
    expect(transactionInputSchema.safeParse({ ...input, valueCents: MAX_ENTRY_CENTS }).success).toBe(true);
  });

  test.each([MAX_ENTRY_CENTS + 1, 1e300])('rejects %p, above the largest amount', (valueCents) => {
    expect(transactionInputSchema.safeParse({ ...input, valueCents }).success).toBe(false);
  });

  test('leaves an absent recurrence undefined', () => {
    expect(transactionInputSchema.parse({ ...input, recurrence: undefined }).recurrence).toBeUndefined();
  });

  test('accepts weekly weekdays on a recurring entry and stores them sorted', () => {
    const weekly = { ...input, recurring: true, recurrence: { frequency: 'weekly', weekdays: [5, 1] } };
    expect(transactionInputSchema.parse(weekly).recurrence).toEqual({
      frequency: 'weekly',
      weekdays: [1, 5],
    });
  });

  test('lets an empty weekly list through, for validateInput to ask for a weekday', () => {
    const weekly = { ...input, recurring: true, recurrence: { frequency: 'weekly', weekdays: [] } };
    const parsed = transactionInputSchema.parse(weekly);
    expect(validateInput(parsed, l10n.t)).toBe('Escolha ao menos um dia da semana.');
  });

  test.each([
    { name: 'a weekday above 6', recurring: true, recurrence: { frequency: 'weekly', weekdays: [7] } },
    { name: 'a negative weekday', recurring: true, recurrence: { frequency: 'weekly', weekdays: [-1] } },
    { name: 'a fractional weekday', recurring: true, recurrence: { frequency: 'weekly', weekdays: [1.5] } },
    { name: 'a repeated weekday', recurring: true, recurrence: { frequency: 'weekly', weekdays: [1, 1] } },
    { name: 'weekdays on monthly', recurring: true, recurrence: { frequency: 'monthly', weekdays: [1] } },
    { name: 'an unknown frequency', recurring: true, recurrence: { frequency: 'daily' } },
    {
      name: 'weekly on a one-off entry',
      recurring: false,
      recurrence: { frequency: 'weekly', weekdays: [1] },
    },
    {
      name: 'weekly on an acerto',
      recurring: true,
      type: 'acerto',
      categoryId: null,
      recurrence: { frequency: 'weekly', weekdays: [1] },
    },
  ])('rejects $name', ({ name: _name, ...patch }) => {
    expect(transactionInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });

  test('keeps the total of a very large ledger exact', () => {
    const HOUSEHOLD_ENTRY_CEILING = 50_000;
    expect(Number.isSafeInteger(MAX_ENTRY_CENTS * HOUSEHOLD_ENTRY_CEILING)).toBe(true);
  });
});

describe('validateInput', () => {
  test('asks for the date when the day does not exist', () => {
    const input = { ...aTransaction(), date: '2026-02-31' };
    expect(validateInput(input, l10n.t)).toBe(l10n.t('form.date'));
  });
});
