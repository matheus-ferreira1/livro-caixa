import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import {
  FORM_MESSAGES,
  applyTypeChange,
  draftFromTransaction,
  draftToInput,
  emptyDraft,
  toTransaction,
  validateInput,
  type TransactionDraft,
} from './transaction-input';

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
    });
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

  test('keeps split when staying on expense', () => {
    expect(applyTypeChange(valid, 'despesa', categories).split).toBe(true);
  });
});

describe('draftToInput + validateInput', () => {
  const check = (patch: Partial<TransactionDraft>) => {
    const result = draftToInput({ ...valid, ...patch });
    return 'error' in result ? result.error : validateInput(result.input);
  };

  test('reports the first problem, in the design order', () => {
    expect(check({ date: '', description: '' })).toBe(FORM_MESSAGES.date);
    expect(check({ description: '   ' })).toBe(FORM_MESSAGES.description);
    expect(check({ value: '0' })).toBe(FORM_MESSAGES.value);
    expect(check({ value: 'abc' })).toBe(FORM_MESSAGES.value);
    expect(check({ categoryId: null })).toBe(FORM_MESSAGES.category);
    expect(check({ type: 'acerto', categoryId: null })).toBeNull();
  });

  test('normalizes a valid draft', () => {
    const result = draftToInput(valid);
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
      },
    });
  });
});

describe('toTransaction', () => {
  const input = (overrides = {}) => {
    const result = draftToInput({ ...valid, ...overrides });
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

  test('editing keeps the series even when recurrence is switched off', () => {
    const existing = aTransaction({ id: 'old', recurring: true, seriesId: 's-luz' });
    const t = toTransaction('old', input({ recurring: false }), existing);
    expect(t).toMatchObject({ id: 'old', recurring: false, seriesId: 's-luz' });
  });
});

describe('draftFromTransaction', () => {
  test('prefills the edit form', () => {
    const t = aTransaction({ valueCents: 18_000, note: 'x', recurring: true });
    expect(draftFromTransaction(t)).toMatchObject({
      value: '180,00',
      note: 'x',
      recurring: true,
      categoryId: t.categoryId,
    });
  });
});
