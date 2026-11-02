import {
  buildDashboard,
  CATEGORY_PALETTE,
  formatCompactAmount,
  formatMoney,
  type Category,
  type Dashboard,
  type SummaryMode,
  type Transaction,
} from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { dashboardViewModel } from './view-model';

const MONTH = '2026-10';
const TODAY = '2026-10-10';

const entry = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  date: `${MONTH}-15`,
  description: 'Lançamento',
  note: '',
  type: 'despesa',
  categoryId: null,
  valueCents: 10_000,
  split: false,
  confirmed: true,
  recurring: false,
  seriesId: null,
  ...overrides,
});

const income = (date: string, valueCents: number) => entry({ date, type: 'receita', valueCents });
const expense = (date: string, valueCents: number) => entry({ date, type: 'despesa', valueCents });

const category = (id: string, color: string): Category => ({
  id,
  name: `Categoria ${id}`,
  type: 'despesa',
  color,
});

const dashboardOf = (
  transactions: Transaction[],
  { mode = 'real', categories = [] }: { mode?: SummaryMode; categories?: Category[] } = {},
): Dashboard =>
  buildDashboard({
    transactions,
    categories,
    settings: { partnerName: 'Bia', partnerShare: 50 },
    month: MONTH,
    mode,
  });

const vmOf = (...args: Parameters<typeof dashboardOf>) => dashboardViewModel(dashboardOf(...args), TODAY);

const tile = (vm: ReturnType<typeof vmOf>, label: string) => {
  const found = vm.tiles.find((t) => t.label === label);
  if (!found) throw new Error(`Tile ${label} is missing`);
  return found;
};

describe('tiles', () => {
  test('an empty month shows dashes and neutral deltas', () => {
    const vm = vmOf([]);
    expect(tile(vm, 'Balanço do mês')).toMatchObject({
      hint: 'Receitas + acertos − despesas',
      value: '—',
      delta: { label: 'Sem lançamentos no mês', tone: 'neutral', direction: null },
    });
    expect(tile(vm, 'Taxa de poupança')).toMatchObject({
      value: '—',
      delta: { label: 'Sem média para comparar', tone: 'neutral' },
    });
    expect(tile(vm, 'Gasto líquido')).toMatchObject({
      hint: 'Despesas menos o acerto de Bia',
      value: '—',
      delta: { label: 'Sem média para comparar' },
    });
    expect(tile(vm, 'Acumulado no ano')).toMatchObject({
      hint: 'Ainda sem lançamentos no ano',
      value: '—',
    });
  });

  test('balance names the previous month when it has no data', () => {
    const vm = vmOf([income(`${MONTH}-05`, 100_000)]);
    expect(tile(vm, 'Balanço do mês').delta?.label).toBe('Sem dados de Setembro');
  });

  test('balance compares with the previous month', () => {
    const vm = vmOf([income(`${MONTH}-05`, 100_000), income('2026-09-05', 80_000)]);
    expect(tile(vm, 'Balanço do mês')).toMatchObject({
      value: formatMoney(100_000),
      delta: { label: `${formatMoney(20_000)} a mais que Setembro`, tone: 'good', direction: 'up' },
    });
    const worse = vmOf([income(`${MONTH}-05`, 50_000), income('2026-09-05', 80_000)]);
    expect(tile(worse, 'Balanço do mês').delta).toEqual({
      label: `${formatMoney(30_000)} a menos que Setembro`,
      tone: 'bad',
      direction: 'down',
    });
  });

  test('a negative balance is colored', () => {
    expect(tile(vmOf([expense(`${MONTH}-05`, 10_000)]), 'Balanço do mês').negative).toBe(true);
  });

  test('savings rate compares in percentage points', () => {
    const vm = vmOf([
      income(`${MONTH}-05`, 100_000),
      expense(`${MONTH}-06`, 50_000),
      income('2026-09-05', 100_000),
      expense('2026-09-06', 75_000),
    ]);
    expect(tile(vm, 'Taxa de poupança')).toMatchObject({
      value: '50%',
      delta: { label: '+25,0 p.p. vs média de 12 meses', tone: 'good', direction: 'up' },
    });
  });

  test('a lower savings rate uses U+2212', () => {
    const vm = vmOf([
      income(`${MONTH}-05`, 100_000),
      expense(`${MONTH}-06`, 75_000),
      income('2026-09-05', 100_000),
      expense('2026-09-06', 50_000),
    ]);
    expect(tile(vm, 'Taxa de poupança').delta).toEqual({
      label: '−25,0 p.p. vs média de 12 meses',
      tone: 'bad',
      direction: 'down',
    });
  });

  test.each([
    [20_000, 'Na média dos últimos 12 meses', 'neutral', null],
    [30_000, '50% acima da média de 12 meses', 'bad', 'up'],
    [10_000, '50% abaixo da média de 12 meses', 'good', 'down'],
  ])('net spend of %i reads "%s"', (cents, label, tone, direction) => {
    const vm = vmOf([expense(`${MONTH}-05`, cents), expense('2026-09-05', 20_000)]);
    expect(tile(vm, 'Gasto líquido').delta).toEqual({ label, tone, direction });
  });

  test('year to date states its range and monthly average', () => {
    const vm = vmOf([income('2026-01-05', 10_000), income(`${MONTH}-05`, 30_000)]);
    expect(tile(vm, 'Acumulado no ano')).toMatchObject({
      hint: 'Janeiro a Outubro de 2026',
      value: formatMoney(40_000),
      delta: { label: `Média de ${formatMoney(20_000)} por mês`, tone: 'neutral', direction: null },
    });
  });
});

describe('chart', () => {
  test('labels the first month and every January with the year', () => {
    const { groups } = vmOf([]).chart;
    expect(groups.map((g) => g.label)).toEqual([
      'Nov ’25',
      'Dez',
      'Jan ’26',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
    ]);
    expect(groups.map((g) => g.current)).toEqual([...Array<boolean>(11).fill(false), true]);
  });

  test('scales the bars against the top tick and keeps small bars visible', () => {
    const { groups, ticks } = vmOf([income(`${MONTH}-05`, 1_000_000), expense(`${MONTH}-06`, 1_000)]).chart;
    const current = groups[11];
    expect(current?.incomeHeight).toBe('max(2px, 100.00%)');
    expect(current?.expenseHeight).toBe('max(2px, 0.10%)');
    expect(groups[0]?.incomeHeight).toBe('0px');
    expect(ticks.map((t) => t.label)).toEqual(
      [0, 250_000, 500_000, 750_000, 1_000_000].map(formatCompactAmount),
    );
    expect(ticks.map((t) => t.top)).toEqual(['100.00%', '75.00%', '50.00%', '25.00%', '0.00%']);
  });

  test('keeps the tooltip of the edge months inside the chart', () => {
    const { groups } = vmOf([]).chart;
    expect(groups.map((g) => g.tooltipAlign)).toEqual([
      'start',
      'start',
      ...Array<string>(8).fill('center'),
      'end',
      'end',
    ]);
  });

  test('gives each group its tooltip values and aria label', () => {
    const { groups } = vmOf([
      income(`${MONTH}-05`, 100_000),
      expense(`${MONTH}-06`, 40_000),
      entry({ type: 'acerto', valueCents: 5_000 }),
    ]).chart;
    expect(groups[11]).toMatchObject({
      title: 'Outubro 2026',
      hasData: true,
      income: formatMoney(100_000),
      expense: formatMoney(40_000),
      settlement: formatMoney(5_000),
      balance: formatMoney(65_000),
      ariaLabel: `Outubro 2026: receitas ${formatMoney(100_000)}, despesas ${formatMoney(40_000)}`,
    });
    expect(groups[0]?.hasData).toBe(false);
  });
});

describe('donut', () => {
  const blue = CATEGORY_PALETTE[0];
  const orange = CATEGORY_PALETTE[1];

  test('is empty without expenses', () => {
    expect(vmOf([]).donut).toBeNull();
  });

  test('the legend follows the ranking and the segments follow the palette', () => {
    const categories = [category('blue', blue), category('orange', orange)];
    const { donut } = vmOf(
      [
        entry({ categoryId: 'blue', valueCents: 2_500 }),
        entry({ categoryId: 'orange', valueCents: 7_500 }),
        entry({ categoryId: null, valueCents: 1_000 }),
      ],
      { categories },
    );
    expect(donut?.legend.map((l) => l.name)).toEqual(['Categoria orange', 'Categoria blue', 'Sem categoria']);
    expect(donut?.segments.map((s) => s.color)).toEqual([blue, orange, '#9AA29D']);
  });

  test('segments start where the previous one ends, with a gap between them', () => {
    const categories = [category('blue', blue), category('orange', orange)];
    const { donut } = vmOf(
      [entry({ categoryId: 'blue', valueCents: 5_000 }), entry({ categoryId: 'orange', valueCents: 5_000 })],
      { categories },
    );
    const circumference = 2 * Math.PI * 80;
    expect(donut?.segments[0]?.offset).toBe('0.00');
    expect(donut?.segments[1]?.offset).toBe((-circumference / 2).toFixed(2));
    expect(donut?.segments[0]?.dash).toBe(
      `${(circumference / 2 - 2).toFixed(2)} ${circumference.toFixed(2)}`,
    );
  });

  test('a single segment has no gap', () => {
    const { donut } = vmOf([entry({ valueCents: 5_000 })]);
    const circumference = 2 * Math.PI * 80;
    expect(donut?.segments[0]?.dash).toBe(`${circumference.toFixed(2)} ${circumference.toFixed(2)}`);
  });

  test('labels values, percentages and the center', () => {
    const categories = [category('blue', blue), category('orange', orange)];
    const { donut } = vmOf(
      [entry({ categoryId: 'blue', valueCents: 7_500 }), entry({ categoryId: 'orange', valueCents: 2_500 })],
      { categories },
    );
    expect(donut?.legend[0]).toMatchObject({ value: formatMoney(7_500), percent: '75%' });
    expect(donut?.center).toEqual({
      title: 'Total de despesas',
      value: formatMoney(10_000),
      sub: '2 lançamentos',
    });
    expect(donut?.legend[0]?.center).toEqual({
      title: 'Categoria blue',
      value: formatMoney(7_500),
      sub: '75% das despesas',
    });
    expect(donut?.ariaLabel).toBe('Despesas por categoria: Categoria blue 75%, Categoria orange 25%');
  });

  test.each([
    [null, 'Sem histórico', 'neutral', null],
    [10_000, 'Na média', 'neutral', null],
    [5_000, '100% vs média', 'bad', 'up'],
    [20_000, '50% vs média', 'good', 'down'],
  ])('with a past value of %s the legend reads "%s"', (past, label, tone, direction) => {
    const history = past === null ? [] : [entry({ date: '2026-09-05', valueCents: past })];
    const { donut } = vmOf([entry({ valueCents: 10_000 }), ...history]);
    expect(donut?.legend[0]?.delta).toEqual({ label, tone, direction });
  });
});

describe('open items', () => {
  const pending = (date: string, overrides: Partial<Transaction> = {}) =>
    entry({ date, confirmed: false, description: `Conta ${date}`, ...overrides });

  test('says everything is confirmed when nothing is open', () => {
    expect(vmOf([]).open).toMatchObject({ summary: 'Tudo confirmado', rows: [], more: null });
  });

  test('summarizes the amounts', () => {
    const { open } = vmOf([
      pending(`${MONTH}-20`, { valueCents: 1_000 }),
      pending(`${MONTH}-21`, { type: 'receita', valueCents: 5_000 }),
    ]);
    expect(open).toMatchObject({
      summary: '2 lançamentos previstos',
      outflow: formatMoney(1_000),
      inflow: formatMoney(5_000),
    });
  });

  test('uses the singular for one entry', () => {
    expect(vmOf([pending(`${MONTH}-20`)]).open.summary).toBe('1 lançamento previsto');
  });

  test('labels a row', () => {
    const categories = [category('c', CATEGORY_PALETTE[0])];
    const { open } = vmOf([pending(`${MONTH}-09`, { categoryId: 'c', valueCents: 1_000 })], { categories });
    expect(open.rows[0]).toMatchObject({
      day: '09/10',
      when: 'Atrasado',
      whenTone: 'late',
      description: `Conta ${MONTH}-09`,
      meta: 'Despesa · Categoria c',
      value: `− ${formatMoney(1_000)}`,
      valueClass: 'text-expense',
      confirmLabel: `Confirmar Conta ${MONTH}-09`,
    });
  });

  test('leaves the category out of an acerto', () => {
    const { open } = vmOf([pending(`${MONTH}-11`, { type: 'acerto', valueCents: 1_000 })]);
    expect(open.rows[0]).toMatchObject({
      when: 'Amanhã',
      whenTone: 'soon',
      meta: 'Acerto',
      value: `+ ${formatMoney(1_000)}`,
    });
  });

  test('links to the remaining previstos', () => {
    const six = ['20', '21', '22', '23', '24', '25'].map((day) => pending(`${MONTH}-${day}`));
    expect(vmOf(six).open.more).toEqual({
      label: 'Ver mais 1 previsto',
      href: `/lancamentos?mes=${MONTH}&status=pending`,
    });
    const seven = [...six, pending(`${MONTH}-26`)];
    expect(vmOf(seven).open.more?.label).toBe('Ver mais 2 previstos');
  });
});

describe('settlement card', () => {
  const split = (valueCents: number) => entry({ split: true, valueCents });

  test('has its own label for each status', () => {
    const received = (valueCents: number) => entry({ type: 'acerto', valueCents });
    expect(vmOf([]).settlement).toMatchObject({ status: 'Sem contas divididas', statusTone: 'none' });
    expect(vmOf([split(1_000)]).settlement).toMatchObject({ status: 'Pendente', statusTone: 'open' });
    expect(vmOf([split(1_000), received(100)]).settlement).toMatchObject({
      status: 'Parcial',
      statusTone: 'open',
    });
    expect(vmOf([split(1_000), received(500)]).settlement).toMatchObject({
      status: 'Quitado',
      statusTone: 'settled',
    });
  });

  test('labels the amounts and the progress', () => {
    const { settlement } = vmOf([split(4_000), entry({ type: 'acerto', valueCents: 500 })]);
    expect(settlement).toEqual({
      status: 'Parcial',
      statusTone: 'open',
      pending: formatMoney(1_500),
      expected: formatMoney(2_000),
      progress: '25.0%',
      progressAria: 'Recebido 25% do acerto',
      detail: `${formatMoney(500)} recebido · 1 conta dividida (${formatMoney(4_000)})`,
    });
  });

  test('uses the plural for several bills', () => {
    expect(vmOf([split(1_000), split(1_000)]).settlement.detail).toContain('2 contas divididas');
  });
});

describe('links', () => {
  test('"Ver tabela" keeps the year and the mode', () => {
    expect(vmOf([]).tableHref).toBe('/resumo?ano=2026');
    expect(vmOf([], { mode: 'proj' }).tableHref).toBe('/resumo?ano=2026&modo=proj');
  });
});
