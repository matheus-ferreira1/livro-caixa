import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/translate';
import { aTransaction } from '../test/builders';
import type { Category } from '../transactions/transaction';
import { categoryBreakdown, OTHERS_COLOR, OTHERS_SLICE_ID } from './category-breakdown';

const t = translator('pt-BR');
const MONTH = '2026-10';
const previousMonth = (index: number) => `2026-${String(index).padStart(2, '0')}`;

const aCategory = (id: string, color = '#2A78D6'): Category => ({
  id,
  name: `Categoria ${id}`,
  type: 'despesa',
  color,
});

const expense = (categoryId: string | null, valueCents: number, overrides = {}) =>
  aTransaction({ type: 'despesa', date: `${MONTH}-10`, categoryId, valueCents, ...overrides });

const breakdownOf = (current: ReturnType<typeof expense>[], categories: Category[], history = new Map()) =>
  categoryBreakdown({ current, history, categories, mode: 'real', t });

describe('categoryBreakdown', () => {
  test('ranks categories by value, with their share of the total', () => {
    const categories = [aCategory('a'), aCategory('b', '#EB6834')];
    const result = breakdownOf([expense('a', 2_500), expense('b', 7_500)], categories);
    expect(result.totalCents).toBe(10_000);
    expect(result.count).toBe(2);
    expect(result.slices).toMatchObject([
      { id: 'b', name: 'Categoria b', color: '#EB6834', valueCents: 7_500, share: 0.75 },
      { id: 'a', name: 'Categoria a', color: '#2A78D6', valueCents: 2_500, share: 0.25 },
    ]);
  });

  test('counts only expenses', () => {
    const income = aTransaction({ type: 'receita', date: `${MONTH}-05`, categoryId: 'a', valueCents: 9_000 });
    const result = breakdownOf([income, expense('a', 1_000)], [aCategory('a')]);
    expect(result.totalCents).toBe(1_000);
  });

  test('"real" skips previstos and "proj" counts them', () => {
    const entries = [expense('a', 1_000), expense('a', 3_000, { confirmed: false })];
    const categories = [aCategory('a')];
    const base = { current: entries, history: new Map(), categories };
    expect(categoryBreakdown({ ...base, mode: 'real', t }).totalCents).toBe(1_000);
    expect(categoryBreakdown({ ...base, mode: 'proj', t }).totalCents).toBe(4_000);
    expect(categoryBreakdown({ ...base, mode: 'proj', t }).count).toBe(2);
  });

  test('keeps the top 6 and puts the rest in "Outras (n)"', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const current = ids.map((id, index) => expense(id, 8_000 - index * 1_000));
    const { slices } = breakdownOf(
      current,
      ids.map((id) => aCategory(id)),
    );
    expect(slices.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', OTHERS_SLICE_ID]);
    expect(slices.at(-1)).toMatchObject({ name: 'Outras (2)', color: OTHERS_COLOR, valueCents: 3_000 });
  });

  test('shows no "Outras" with 6 categories or fewer', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const { slices } = breakdownOf(
      ids.map((id) => expense(id, 1_000)),
      ids.map((id) => aCategory(id)),
    );
    expect(slices.map((s) => s.id)).not.toContain(OTHERS_SLICE_ID);
  });

  test('labels entries with no known category "Sem categoria"', () => {
    const { slices } = breakdownOf([expense(null, 1_000), expense('deleted', 500)], []);
    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({ name: 'Sem categoria', color: OTHERS_COLOR });
    expect(slices[1]).toMatchObject({ name: 'Sem categoria', color: OTHERS_COLOR });
  });

  test('has no slices without expenses', () => {
    expect(breakdownOf([], [aCategory('a')])).toEqual({ slices: [], totalCents: 0, count: 0 });
  });

  describe('against the history', () => {
    test('has no comparison without history', () => {
      const { slices } = breakdownOf([expense('a', 1_000)], [aCategory('a')]);
      expect(slices[0]?.comparison).toEqual({ kind: 'none' });
    });

    test('divides by the prior months with a counted expense, not by 12', () => {
      const history = new Map([
        [previousMonth(1), [expense('a', 2_000, { date: '2026-01-10' })]],
        [previousMonth(2), [expense('b', 1_000, { date: '2026-02-10' })]],
        [previousMonth(3), []],
      ]);
      const { slices } = breakdownOf([expense('a', 1_500)], [aCategory('a'), aCategory('b')], history);
      // (2_000 + 0) over the 2 months with expenses gives an average of 1_000.
      expect(slices[0]?.comparison).toEqual({ kind: 'above', ratio: 0.5 });
    });

    test('ignores history the mode does not count', () => {
      const history = new Map([[previousMonth(1), [expense('a', 2_000, { confirmed: false })]]]);
      const { slices } = breakdownOf([expense('a', 1_500)], [aCategory('a')], history);
      expect(slices[0]?.comparison).toEqual({ kind: 'none' });
    });

    test('compares "Outras" with the average of its own categories', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const current = ids.map((id, index) => expense(id, 8_000 - index * 1_000));
      const history = new Map([
        [previousMonth(1), [expense('g', 1_000), expense('h', 1_000), expense('a', 50_000)]],
      ]);
      const { slices } = breakdownOf(
        current,
        ids.map((id) => aCategory(id)),
        history,
      );
      expect(slices.at(-1)?.comparison).toEqual({ kind: 'above', ratio: 0.5 });
    });
  });
});
