import {
  computeSettlement,
  DEFAULT_LOCALIZATION as pt,
  localization,
  type Category,
  type Transaction,
} from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { settlementViewModel } from './view-model';

const categories = new Map<string, Category>([
  ['c-moradia', { id: 'c-moradia', name: 'Moradia', type: 'despesa', color: '#EB6834' }],
]);

const expense = (overrides: Partial<Transaction>): Transaction => ({
  id: 'x',
  date: '2026-10-01',
  description: 'Condomínio',
  note: '',
  type: 'despesa',
  categoryId: 'c-moradia',
  valueCents: 69_000,
  split: true,
  confirmed: true,
  recurring: false,
  seriesId: null,
  ...overrides,
});

const acerto = (valueCents: number, confirmed: boolean) =>
  expense({ type: 'acerto', categoryId: null, split: false, valueCents, confirmed });

const viewOf = (transactions: Transaction[], includePending = true) =>
  settlementViewModel(
    computeSettlement(transactions, 40, { includePending }),
    {
      month: '2026-10',
      partnerName: 'Bia',
      categories,
      includePending,
    },
    pt,
  );

// Intl puts a no-break space after the currency symbol.
const money = (text: string) => text.replaceAll('R$ ', 'R$ ');

describe('settlementViewModel', () => {
  test('describes each split bill with its date, category and pending flag', () => {
    const vm = viewOf([
      expense({ id: 'a' }),
      expense({ id: 'b', date: '2026-10-30', categoryId: null, confirmed: false }),
    ]);
    expect(vm.items).toEqual([
      {
        id: 'a',
        description: 'Condomínio',
        meta: '01/10 · Moradia',
        total: money('R$ 690,00'),
        partner: money('R$ 276,00'),
      },
      {
        id: 'b',
        description: 'Condomínio',
        meta: '30/10 · previsto',
        total: money('R$ 690,00'),
        partner: money('R$ 276,00'),
      },
    ]);
  });

  test('labels the totals and both shares', () => {
    const vm = viewOf([expense({})]);
    expect(vm).toMatchObject({
      monthLabel: 'Outubro 2026',
      total: money('R$ 690,00'),
      mineLabel: 'Minha parte (60%)',
      partnerLabel: 'Parte de Bia (40%)',
      balance: money('R$ 276,00'),
      deductions: [],
      footnote: 'Divisão 60% / 40% · 1 contas · inclui previstas',
    });
  });

  test('lists what was received and scheduled as deductions', () => {
    const vm = viewOf([expense({}), acerto(10_000, true), acerto(5_000, false)]);
    expect(vm.deductions).toEqual([
      { label: 'Já recebido', value: money('− R$ 100,00') },
      { label: 'Já registrado como previsto', value: money('− R$ 50,00') },
    ]);
  });

  test('says when only confirmed bills count', () => {
    expect(viewOf([expense({})], false).footnote).toBe('Divisão 60% / 40% · 1 contas · só confirmadas');
  });

  test('offers to register the balance, or says the month is already registered', () => {
    expect(viewOf([expense({})]).register).toEqual({
      label: money('Registrar acerto de R$ 276,00'),
      disabled: false,
    });
    expect(viewOf([expense({}), acerto(27_600, false)]).register).toEqual({
      label: 'Acerto do mês já registrado',
      disabled: true,
    });
  });

  test('links the share text to WhatsApp', () => {
    const vm = viewOf([]);
    expect(vm.whatsappUrl).toBe(`https://wa.me/?text=${encodeURIComponent(vm.shareText)}`);
    expect(vm.shareText).toContain('Nenhuma conta dividida neste mês');
  });
});

describe('settlementViewModel in English with US dollars', () => {
  test('words the labels in English and formats amounts with a dot', () => {
    const english = localization('en', 'USD');
    const vm = settlementViewModel(
      computeSettlement([expense({}), expense({ id: 'y', confirmed: false })], 40, { includePending: true }),
      { month: '2026-10', partnerName: 'Bia', categories, includePending: true },
      english,
    );
    expect(vm.monthLabel).toBe('October 2026');
    expect(vm.mineLabel).toBe('My share (60%)');
    expect(vm.partnerLabel).toBe('Bia’s share (40%)');
    expect(vm.items[1]?.meta).toBe('01/10 · Moradia · pending');
    expect(vm.total).toBe('$1,380.00');
    expect(vm.register.label).toBe('Register settlement of $552.00');
    expect(vm.footnote).toBe('Split 60% / 40% · 2 bills · includes pending');
  });
});
