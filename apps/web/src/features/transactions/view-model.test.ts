import {
  DEFAULT_LOCALIZATION as pt,
  localization,
  type Category,
  type Transaction,
} from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { rowViewModel, sortedCategoryChips } from './view-model';

const categories: Category[] = [
  { id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#1BAF7A' },
  { id: 'c-salario', name: 'Salário', type: 'receita', color: '#2A78D6' },
  { id: 'c-agua', name: 'Água', type: 'despesa', color: '#008300' },
];
const byId = new Map(categories.map((c) => [c.id, c]));

const base: Transaction = {
  id: 't1',
  date: '2026-10-10',
  description: 'Conta de água',
  note: 'Leitura de 12/09 a 11/10',
  type: 'despesa',
  categoryId: 'c-agua',
  valueCents: 13_842,
  split: true,
  confirmed: false,
  recurring: true,
  seriesId: 's1',
};

describe('rowViewModel', () => {
  test('maps an expense row', () => {
    const vm = rowViewModel(base, byId, { withYear: false }, pt);
    expect(vm).toMatchObject({
      day: '10/10',
      weekday: 'sáb',
      categoryName: 'Água',
      categoryColor: '#008300',
      typeLabel: 'Despesa',
      valueLabel: '− R$ 138,42',
      canSplit: true,
      statusLabel: 'Previsto',
    });
  });

  test('shows the year in the "Todos" listing', () => {
    expect(rowViewModel(base, byId, { withYear: true }, pt).day).toBe('10/10/26');
  });

  test('labels uncategorized rows', () => {
    expect(
      rowViewModel({ ...base, type: 'acerto', categoryId: null }, byId, { withYear: false }, pt),
    ).toMatchObject({
      categoryName: 'Acerto',
      canSplit: false,
      valueLabel: '+ R$ 138,42',
    });
    expect(rowViewModel({ ...base, categoryId: 'gone' }, byId, { withYear: false }, pt).categoryName).toBe(
      'Sem categoria',
    );
  });
});

describe('sortedCategoryChips', () => {
  test('lists income first, then expenses, each alphabetically', () => {
    expect(sortedCategoryChips(categories).map((c) => c.name)).toEqual(['Salário', 'Água', 'Mercado']);
  });
});

describe('rowViewModel in English with US dollars', () => {
  const english = localization('en', 'USD');

  test('words the labels in English and formats the amount with a dot', () => {
    expect(rowViewModel(base, byId, { withYear: false }, english)).toMatchObject({
      weekday: 'sat',
      typeLabel: 'Expense',
      valueLabel: '− $138.42',
      statusLabel: 'Pending',
    });
  });

  test('labels uncategorized rows in English', () => {
    const settlement = { ...base, type: 'acerto' as const, categoryId: null };
    expect(rowViewModel(settlement, byId, { withYear: false }, english).categoryName).toBe('Settlement');
    expect(
      rowViewModel({ ...base, categoryId: 'gone' }, byId, { withYear: false }, english).categoryName,
    ).toBe('No category');
  });
});
