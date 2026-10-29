import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import {
  filterTransactions,
  groupByMonth,
  pageList,
  paginate,
  periodRange,
  sortTransactions,
  defaultSortDirection,
} from './list-query';

describe('filterTransactions', () => {
  const list = [
    aTransaction({
      id: 'a',
      type: 'receita',
      confirmed: true,
      description: 'Salário',
      categoryId: 'c-salario',
    }),
    aTransaction({
      id: 'b',
      type: 'despesa',
      confirmed: false,
      description: 'Conta de luz',
      note: 'Leitura 12/09',
    }),
    aTransaction({ id: 'c', type: 'acerto', confirmed: true, description: 'Acerto', categoryId: null }),
    aTransaction({ id: 'd', type: 'despesa', confirmed: true, date: '2025-12-20', description: 'Presentes' }),
  ];
  const ids = (r: typeof list) => r.map((t) => t.id);

  test('filters by type and status', () => {
    expect(ids(filterTransactions(list, { type: 'despesa' }))).toEqual(['b', 'd']);
    expect(ids(filterTransactions(list, { status: 'pending' }))).toEqual(['b']);
    expect(ids(filterTransactions(list, { status: 'confirmed', type: 'despesa' }))).toEqual(['d']);
  });

  test('searches description and note, case-insensitive', () => {
    expect(ids(filterTransactions(list, { query: 'LEITURA' }))).toEqual(['b']);
    expect(ids(filterTransactions(list, { query: '  salá ' }))).toEqual(['a']);
  });

  test('filters by category, with "none" matching uncategorized entries', () => {
    expect(ids(filterTransactions(list, { category: 'c-salario' }))).toEqual(['a']);
    expect(ids(filterTransactions(list, { category: 'none' }))).toEqual(['c']);
  });

  test('filters by inclusive date range', () => {
    expect(ids(filterTransactions(list, { from: '2026-01-01' }))).toEqual(['a', 'b', 'c']);
    expect(ids(filterTransactions(list, { to: '2025-12-20' }))).toEqual(['d']);
  });
});

describe('periodRange', () => {
  test('resolves presets against today', () => {
    expect(periodRange('all', '2026-10-29')).toEqual({ from: null, to: null });
    expect(periodRange('year', '2026-10-29')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodRange('12m', '2026-10-29')).toEqual({ from: '2025-11-01', to: '2026-10-31' });
    expect(periodRange('custom', '2026-10-29', { from: '2026-02-01', to: '' })).toEqual({
      from: '2026-02-01',
      to: null,
    });
  });
});

describe('sortTransactions', () => {
  const list = [
    aTransaction({ id: 'x', date: '2026-10-05', description: 'Beta', valueCents: 300 }),
    aTransaction({ id: 'y', date: '2026-10-01', description: 'álcool', valueCents: 100 }),
    aTransaction({ id: 'z', date: '2026-10-05', description: 'Alfa', valueCents: 200 }),
  ];
  const ids = (r: typeof list) => r.map((t) => t.id);

  test('sorts by date then description', () => {
    expect(ids(sortTransactions(list, 'date', 'asc'))).toEqual(['y', 'z', 'x']);
    expect(ids(sortTransactions(list, 'date', 'desc'))).toEqual(['x', 'z', 'y']);
  });

  test('sorts by description with pt-BR collation', () => {
    // Accents are ignored: "álcool" sorts before "Alfa".
    expect(ids(sortTransactions(list, 'description', 'asc'))).toEqual(['y', 'z', 'x']);
  });

  test('sorts by value', () => {
    expect(ids(sortTransactions(list, 'value', 'desc'))).toEqual(['x', 'z', 'y']);
  });

  test('knows each column default direction', () => {
    expect(defaultSortDirection('date', 'month')).toBe('asc');
    expect(defaultSortDirection('date', 'all')).toBe('desc');
    expect(defaultSortDirection('description', 'all')).toBe('asc');
    expect(defaultSortDirection('value', 'month')).toBe('desc');
  });
});

describe('pagination', () => {
  test('slices a page and clamps out-of-range pages', () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    expect(paginate(items, 3, 25)).toEqual({
      items: items.slice(50),
      page: 3,
      totalPages: 3,
      start: 51,
      end: 60,
    });
    expect(paginate(items, 9, 25).page).toBe(3);
    expect(paginate([], 1, 25)).toEqual({ items: [], page: 1, totalPages: 1, start: 0, end: 0 });
  });

  test('lists pages around the current one with gaps', () => {
    expect(pageList(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageList(1, 3)).toEqual([1, 2, 3]);
    expect(pageList(1, 1)).toEqual([1]);
  });
});

describe('groupByMonth', () => {
  test('groups consecutive rows by month with stats from the whole filtered set', () => {
    const all = [
      aTransaction({ id: 'a', date: '2026-10-20', type: 'receita', valueCents: 1_000 }),
      aTransaction({ id: 'b', date: '2026-10-02', type: 'despesa', valueCents: 3_000 }),
      aTransaction({ id: 'c', date: '2026-09-30', type: 'acerto', valueCents: 500 }),
    ];
    const groups = groupByMonth(all.slice(0, 2), all);
    expect(groups).toEqual([{ monthKey: '2026-10', count: 2, netCents: -2_000, items: all.slice(0, 2) }]);
    expect(groupByMonth(all, all).map((g) => g.monthKey)).toEqual(['2026-10', '2026-09']);
  });
});
