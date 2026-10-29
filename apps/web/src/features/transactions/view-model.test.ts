import type { Category, Transaction } from '@livro-caixa/domain';
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
    const vm = rowViewModel(base, byId, { withYear: false });
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
    expect(rowViewModel(base, byId, { withYear: true }).day).toBe('10/10/26');
  });

  test('labels uncategorized rows', () => {
    expect(
      rowViewModel({ ...base, type: 'acerto', categoryId: null }, byId, { withYear: false }),
    ).toMatchObject({
      categoryName: 'Acerto',
      canSplit: false,
      valueLabel: '+ R$ 138,42',
    });
    expect(rowViewModel({ ...base, categoryId: 'gone' }, byId, { withYear: false }).categoryName).toBe(
      'Sem categoria',
    );
  });
});

describe('sortedCategoryChips', () => {
  test('lists income first, then expenses, each alphabetically', () => {
    expect(sortedCategoryChips(categories).map((c) => c.name)).toEqual(['Salário', 'Água', 'Mercado']);
  });
});
