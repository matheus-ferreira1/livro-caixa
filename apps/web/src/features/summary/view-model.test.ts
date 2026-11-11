import {
  DEFAULT_LOCALIZATION,
  localization,
  yearSummary,
  type Localization,
  type Transaction,
} from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { summaryViewModel } from './view-model';

const SHARE = 50;
const CURRENT_MONTH = '2026-03';

const entry = (
  date: string,
  type: Transaction['type'],
  valueCents: number,
  confirmed = true,
): Transaction => ({
  id: `${date}-${type}-${valueCents}`,
  date,
  description: 'Lançamento',
  note: '',
  type,
  categoryId: null,
  valueCents,
  split: false,
  confirmed,
  recurring: false,
  seriesId: null,
});

const viewModel = (
  entries: Transaction[],
  mode: 'real' | 'proj' = 'real',
  l10n: Localization = DEFAULT_LOCALIZATION,
) => summaryViewModel(yearSummary(entries, 2026, mode, SHARE), CURRENT_MONTH, l10n);

const row = (vm: ReturnType<typeof viewModel>, month: string) => {
  const found = vm.months.find((m) => m.month === month);
  if (!found) throw new Error(`Month ${month} is missing`);
  return found;
};

describe('summaryViewModel tiles', () => {
  test('labels the year totals as in the design', () => {
    const { tiles } = viewModel([
      entry('2026-01-05', 'receita', 100_000),
      entry('2026-01-06', 'acerto', 5_000),
      entry('2026-02-05', 'despesa', 20_000),
    ]);
    expect(tiles).toEqual([
      expect.objectContaining({
        label: 'Receitas no ano',
        value: 'R$ 1.000,00',
        sub: 'Mais R$ 50,00 em acertos',
      }),
      expect.objectContaining({
        label: 'Despesas no ano',
        value: 'R$ 200,00',
        sub: 'Média de R$ 100,00 por mês',
      }),
      expect.objectContaining({
        label: 'Média de balanço mensal',
        value: 'R$ 425,00',
        sub: 'Em 2 meses com lançamentos',
        negative: false,
      }),
      expect.objectContaining({
        label: 'Acumulado no ano',
        value: 'R$ 850,00',
        sub: 'Melhor mês: Janeiro (R$ 1.050,00)',
        dark: true,
        negative: false,
      }),
    ]);
  });

  test('uses the singular for one month with entries and flags a negative balance', () => {
    const { tiles } = viewModel([entry('2026-01-05', 'despesa', 1_000)]);
    expect(tiles[2]).toMatchObject({ sub: 'Em 1 mês com lançamentos', negative: true, value: '−R$ 10,00' });
    expect(tiles[3]).toMatchObject({ negative: true });
  });

  test('says when the year has no entries', () => {
    const { tiles } = viewModel([]);
    expect(tiles[2]?.sub).toBe('Nenhum mês com lançamentos');
    expect(tiles[3]?.sub).toBe('Sem lançamentos no ano');
  });
});

describe('summaryViewModel months', () => {
  test('shows dashes for a month with no data, even when it has previstos', () => {
    const vm = viewModel([entry('2026-02-05', 'despesa', 1_000, false)]);
    expect(row(vm, '2026-02')).toMatchObject({
      name: 'Fevereiro',
      income: '—',
      expense: '—',
      settlement: '—',
      balance: '—',
      balanceTone: 'muted',
      statusLabel: 'Em aberto',
      statusTone: 'open',
      bar: null,
    });
  });

  test('labels the three statuses', () => {
    const vm = viewModel([entry('2026-02-05', 'despesa', 1_000)]);
    expect(row(vm, '2026-01')).toMatchObject({ statusLabel: 'Sem lançamentos', statusTone: 'empty' });
    expect(row(vm, '2026-02')).toMatchObject({ statusLabel: 'Fechado', statusTone: 'closed' });
  });

  test('marks only the current month', () => {
    const vm = viewModel([]);
    expect(vm.months.filter((m) => m.isCurrent).map((m) => m.month)).toEqual([CURRENT_MONTH]);
  });

  test('shows a dash for an acerto of zero in a month with data', () => {
    const vm = viewModel([entry('2026-02-05', 'despesa', 1_000)]);
    expect(row(vm, '2026-02')).toMatchObject({ settlement: '—', hasSettlement: false });
  });

  test('links each month to its entries', () => {
    expect(row(viewModel([]), '2026-07')).toMatchObject({
      openLabel: 'Ver lançamentos de Julho',
      href: '/lancamentos?mes=2026-07',
    });
  });

  test('scales the Acumulado bars to the largest running total', () => {
    const vm = viewModel([entry('2026-01-05', 'receita', 1_000), entry('2026-02-05', 'despesa', 3_000)]);
    expect(row(vm, '2026-01')).toMatchObject({
      accumulated: 'R$ 10,00',
      accumulatedWidth: '50.0%',
      accumulatedNegative: false,
    });
    expect(row(vm, '2026-02')).toMatchObject({
      accumulated: '−R$ 20,00',
      accumulatedWidth: '100.0%',
      accumulatedNegative: true,
    });
    expect(row(vm, '2026-03')).toMatchObject({ accumulated: '—', accumulatedWidth: '0%' });
  });
});

describe('summaryViewModel chart', () => {
  test('places the bars around the zero line', () => {
    const vm = viewModel([entry('2026-01-05', 'receita', 30_000), entry('2026-02-05', 'despesa', 10_000)]);
    expect(vm.zeroLineTop).toBe('75.00%');
    expect(row(vm, '2026-01').bar).toMatchObject({
      top: '0.00%',
      height: 'max(2px, 75.00%)',
      labelTop: 'calc(0.00% - 20px)',
      positive: true,
      tone: 'surplus',
      compactLabel: '300',
      ariaLabel: 'Janeiro: balanço de R$ 300,00',
    });
    expect(row(vm, '2026-02').bar).toMatchObject({
      top: '75.00%',
      height: 'max(2px, 25.00%)',
      labelTop: 'calc(100.00% + 4px)',
      positive: false,
      tone: 'deficit',
      compactLabel: '−100',
    });
  });

  test('softens the bar of a month with previstos', () => {
    const vm = viewModel(
      [entry('2026-01-05', 'receita', 30_000, false), entry('2026-02-05', 'despesa', 10_000, false)],
      'proj',
    );
    expect(row(vm, '2026-01').bar?.tone).toBe('surplus-pending');
    expect(row(vm, '2026-02').bar?.tone).toBe('deficit-pending');
  });

  test('keeps the zero line at the top of a year with no data', () => {
    expect(viewModel([]).zeroLineTop).toBe('0.00%');
  });
});

describe('summaryViewModel totals', () => {
  test('tones the total balance by its sign', () => {
    expect(viewModel([entry('2026-01-05', 'receita', 1_000)]).totals).toMatchObject({
      balanceTone: 'income',
      balance: 'R$ 10,00',
    });
    expect(viewModel([entry('2026-01-05', 'despesa', 1_000)]).totals.balanceTone).toBe('expense');
  });
});

describe('summaryViewModel in other languages and currencies', () => {
  const entries = [entry('2026-02-05', 'receita', 123_456), entry('2026-03-10', 'despesa', 10_000)];

  test('words the tiles, months and bars in English with dollar amounts', () => {
    const vm = viewModel(entries, 'real', localization('en', 'USD'));
    expect(vm.tiles[0]).toMatchObject({ label: 'Income this year', value: '$1,234.56' });
    expect(vm.tiles[2]?.sub).toBe('Over 2 months with entries');
    expect(vm.tiles[3]?.sub).toBe('Best month: February ($1,234.56)');
    expect(row(vm, '2026-02')).toMatchObject({
      name: 'February',
      shortName: 'Feb',
      statusLabel: 'Closed',
      openLabel: 'View entries for February',
    });
    expect(row(vm, '2026-02').bar?.compactLabel).toBe('1.2K');
    expect(row(vm, '2026-02').bar?.ariaLabel).toBe('February: balance of $1,234.56');
  });

  test('keeps Portuguese copy with dollar amounts', () => {
    const vm = viewModel(entries, 'real', localization('pt-BR', 'USD'));
    expect(vm.tiles[0]).toMatchObject({ label: 'Receitas no ano', value: '$1,234.56' });
    expect(row(vm, '2026-02').bar?.compactLabel).toBe('1,2\u00a0mil');
  });

  test('keeps English copy with real amounts', () => {
    const vm = viewModel(entries, 'real', localization('en', 'BRL'));
    expect(vm.tiles[0]?.label).toBe('Income this year');
    expect(vm.tiles[0]?.value).toBe('R$\u00a01.234,56');
  });
});
