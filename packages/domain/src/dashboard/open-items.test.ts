import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import type { Category } from '../transactions/transaction';
import { translator } from '../i18n/translate';
import { openItems, relativeDue } from './open-items';

const t = translator('pt-BR');

const groceries: Category = { id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#2A78D6' };

const pending = (date: string, description: string, overrides = {}) =>
  aTransaction({ date, description, confirmed: false, type: 'despesa', categoryId: null, ...overrides });

describe('openItems', () => {
  test('lists only unconfirmed entries, by date then description', () => {
    const entries = [
      pending('2026-10-20', 'Água'),
      aTransaction({ date: '2026-10-01', confirmed: true }),
      pending('2026-10-05', 'Luz'),
      pending('2026-10-05', 'Aluguel'),
    ];
    const { items, count } = openItems(entries, []);
    expect(items.map((i) => i.description)).toEqual(['Aluguel', 'Luz', 'Água']);
    expect(count).toBe(3);
  });

  test('returns the first 5 and counts them all', () => {
    const entries = ['01', '02', '03', '04', '05', '06', '07'].map((day) =>
      pending(`2026-10-${day}`, `Conta ${day}`, { valueCents: 1_000 }),
    );
    const { items, count, outflowCents } = openItems(entries, []);
    expect(items).toHaveLength(5);
    expect(count).toBe(7);
    expect(outflowCents).toBe(7_000);
  });

  test('sums expenses as outflow and every other type as inflow', () => {
    const entries = [
      pending('2026-10-01', 'Luz', { valueCents: 1_000 }),
      pending('2026-10-02', 'Salário', { type: 'receita', valueCents: 5_000 }),
      pending('2026-10-03', 'Acerto', { type: 'acerto', valueCents: 700 }),
    ];
    expect(openItems(entries, [])).toMatchObject({ outflowCents: 1_000, inflowCents: 5_700 });
  });

  test('names the category of each item', () => {
    const entries = [
      pending('2026-10-01', 'Feira', { categoryId: groceries.id }),
      pending('2026-10-02', 'Acerto', { type: 'acerto' }),
    ];
    const { items } = openItems(entries, [groceries]);
    expect(items.map((i) => i.categoryName)).toEqual(['Mercado', null]);
  });
});

describe('relativeDue', () => {
  test.each([
    ['2026-10-09', { label: 'Atrasado', tone: 'late' }],
    ['2026-10-10', { label: 'Hoje', tone: 'soon' }],
    ['2026-10-11', { label: 'Amanhã', tone: 'soon' }],
    ['2026-10-13', { label: 'Em 3 dias', tone: 'soon' }],
    ['2026-10-14', { label: 'Em 4 dias', tone: 'later' }],
  ])('labels %s against 2026-10-10', (date, expected) => {
    expect(relativeDue(date, '2026-10-10', t)).toEqual(expected as ReturnType<typeof relativeDue>);
  });

  test('counts across months and leap days', () => {
    expect(relativeDue('2028-03-01', '2028-02-28', t).label).toBe('Em 2 dias');
    expect(relativeDue('2027-01-01', '2026-12-31', t).label).toBe('Amanhã');
  });
});
