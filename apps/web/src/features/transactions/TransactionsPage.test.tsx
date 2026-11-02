import type { Transaction } from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { TransactionsPage } from './TransactionsPage';

const CATEGORIES = [
  { id: 'c-salario', name: 'Salário', type: 'receita', color: '#2A78D6' },
  { id: 'c-moradia', name: 'Moradia', type: 'despesa', color: '#EB6834' },
  { id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#1BAF7A' },
];

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'x',
  date: '2026-10-10',
  description: 'Item',
  note: '',
  type: 'despesa',
  categoryId: 'c-mercado',
  valueCents: 1_000,
  split: false,
  confirmed: true,
  recurring: false,
  seriesId: null,
  ...overrides,
});

const OCTOBER = [
  tx({
    id: 'sal',
    date: '2026-10-05',
    description: 'Salário',
    type: 'receita',
    categoryId: 'c-salario',
    valueCents: 850_000,
    note: 'Valor líquido',
    recurring: true,
  }),
  tx({
    id: 'cond',
    date: '2026-10-01',
    description: 'Condomínio',
    categoryId: 'c-moradia',
    valueCents: 69_000,
    split: true,
  }),
  tx({
    id: 'feira',
    date: '2026-10-30',
    description: 'Feira e hortifrúti',
    valueCents: 18_640,
    split: true,
    confirmed: false,
  }),
  tx({
    id: 'ac',
    date: '2026-10-26',
    description: 'Acerto das contas',
    type: 'acerto',
    categoryId: null,
    valueCents: 20_000,
  }),
];

function setup(path = '/lancamentos?mes=2026-10') {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const fetch = mockApi((url, init) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined });
    if (url === '/api/categories') return { status: 200, body: { categories: CATEGORIES } };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 50 } } };
    if (url.startsWith('/api/transactions?month=2026-10'))
      return { status: 200, body: { transactions: OCTOBER } };
    if (url.startsWith('/api/transactions?month=')) return { status: 200, body: { transactions: [] } };
    if (url.startsWith('/api/transactions/search'))
      return {
        status: 200,
        body: {
          items: OCTOBER.slice(0, 2),
          page: 1,
          totalPages: 3,
          start: 1,
          end: 25,
          total: 60,
          totals: { incomeCents: 850_000, expenseCents: 69_000, settlementCents: 0, balanceCents: 781_000 },
          groups: [{ monthKey: '2026-10', count: 2, netCents: 781_000, ids: ['sal', 'cond'] }],
        },
      };
    if (method === 'PATCH') return { status: 200, body: { transaction: OCTOBER[0] } };
    if (method === 'DELETE') return { status: 204 };
    return undefined;
  });
  const view = renderRoutes([{ path: '/lancamentos', element: <TransactionsPage /> }], path);
  return { ...view, calls, fetch };
}

const tile = (label: string) => screen.getByRole('region', { name: label });

describe('TransactionsPage — month mode', () => {
  test('shows the month, its tiles and its rows', async () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Outubro 2026' })).toBeInTheDocument();
    expect(await screen.findByText('Condomínio')).toBeInTheDocument();

    expect(tile('Receitas')).toHaveTextContent('R$ 8.500,00');
    expect(tile('Despesas')).toHaveTextContent('R$ 690,00');
    expect(tile('Despesas')).toHaveTextContent('Previsto no mês: R$ 876,40');
    // partner = 50% of (690 + 186,40) = 438,20; received 200
    expect(tile('Acerto a receber')).toHaveTextContent('R$ 238,20');
    expect(tile('Acerto a receber')).toHaveTextContent('Recebido de Bia: R$ 200,00');
    expect(tile('Saldo realizado')).toHaveTextContent('R$ 8.010,00');

    const rows = screen.getAllByRole('button', { name: /clique para alternar/ });
    expect(rows).toHaveLength(4);
    expect(screen.getByText('4 de 4 lançamentos')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Recorrente' })).toBeInTheDocument();
  });

  test('filters by type, status and search text', async () => {
    const { user } = setup();
    await screen.findByText('Condomínio');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Filtrar por tipo' })).getByRole('radio', {
        name: 'Despesas',
      }),
    );
    expect(screen.queryByText('Salário', { selector: 'span' })).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Filtrar por status' })).getByRole('radio', {
        name: 'Previstos',
      }),
    );
    expect(screen.getByText('1 de 4 lançamentos')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar lançamentos' }), 'xyz');
    expect(screen.getByText('Nenhum lançamento corresponde aos filtros.')).toBeInTheDocument();
  });

  test('navigates months', async () => {
    const { user } = setup();
    await screen.findByText('Condomínio');
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('heading', { name: 'Novembro 2026' })).toBeInTheDocument();
    expect(await screen.findByText('Ainda não há lançamentos neste mês.')).toBeInTheDocument();
  });

  test('toggles status and split inline', async () => {
    const { user, calls } = setup();
    await user.click(await screen.findByRole('button', { name: 'Previsto, clique para alternar' }));
    expect(calls).toContainEqual({
      method: 'PATCH',
      url: '/api/transactions/feira',
      body: { confirmed: true },
    });
    // Only the two expenses get a split toggle; rows are in date order, so Condomínio comes first.
    const splitToggles = screen.getAllByRole('button', { name: /^Conta dividida/ });
    expect(splitToggles).toHaveLength(2);
    await user.click(splitToggles[0] as HTMLElement);
    expect(calls).toContainEqual({ method: 'PATCH', url: '/api/transactions/cond', body: { split: false } });
  });

  test('deletes only after inline confirmation', async () => {
    const { user, calls } = setup();
    await user.click(await screen.findByRole('button', { name: 'Excluir Condomínio' }));
    expect(screen.getByText('Excluir “Condomínio”? Esta ação não pode ser desfeita.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Excluir Condomínio' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'DELETE', url: '/api/transactions/cond', body: undefined }),
    );
    expect(await screen.findByText('Lançamento excluído')).toBeInTheDocument();
  });

  test('"Gerar acerto" opens the settlement of the viewed month', async () => {
    const { user } = setup();
    await screen.findByText('Condomínio');
    await user.click(screen.getByRole('button', { name: 'Gerar acerto' }));
    const dialog = screen.getByRole('dialog', { name: 'Acerto de contas' });
    expect(dialog).toHaveTextContent('Outubro 2026 · contas divididas com Bia');
    expect(dialog).toHaveTextContent('Valor a acertar por BiaR$ 238,20');
  });

  test('sorts by value from the column header', async () => {
    const { user } = setup();
    await screen.findByText('Condomínio');
    await user.click(screen.getByRole('button', { name: 'Ordenar por valor, decrescente' }));
    const descriptions = screen
      .getAllByRole('button', { name: /^Excluir / })
      .map((b) => b.getAttribute('aria-label'));
    expect(descriptions[0]).toBe('Excluir Salário');
    expect(screen.getByRole('button', { name: 'Ordenar por valor, crescente' })).toBeInTheDocument();
  });
});

describe('TransactionsPage — Todos mode', () => {
  test('switches to the full listing with filters, month groups and pager', async () => {
    const { user, calls } = setup();
    await screen.findByText('Condomínio');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Modo de exibição' })).getByRole('radio', {
        name: 'Todos',
      }),
    );

    expect(screen.getByRole('heading', { name: 'Todos os lançamentos' })).toBeInTheDocument();
    expect(await screen.findByText('Mostrando 1–25 de 60')).toBeInTheDocument();
    expect(tile('Saldo dos resultados')).toHaveTextContent('60 lançamentos encontrados');
    expect(screen.getByRole('button', { name: 'Abrir Outubro 2026 na visão por mês' })).toBeInTheDocument();
    expect(screen.getByText('05/10/26')).toBeInTheDocument();
    expect(calls.find((c) => c.url.startsWith('/api/transactions/search'))?.url).toContain(
      'sort=date&dir=desc&page=1&pageSize=25',
    );

    await user.click(screen.getByRole('button', { name: 'Moradia' }));
    expect(calls.at(-1)?.url).toContain('category=c-moradia');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Período' })).getByRole('radio', {
        name: 'Personalizado',
      }),
    );
    expect(screen.getByLabelText('De')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(calls.at(-1)?.url).toContain('page=3');
  });

  test('hides "Gerar acerto" outside month mode', async () => {
    setup('/lancamentos?modo=all');
    await screen.findByText('Mostrando 1–25 de 60');
    expect(screen.queryByRole('button', { name: 'Gerar acerto' })).not.toBeInTheDocument();
  });

  test('"Abrir mês" goes back to that month', async () => {
    const { user } = setup('/lancamentos?modo=all');
    await user.click(await screen.findByRole('button', { name: 'Abrir Outubro 2026 na visão por mês' }));
    expect(screen.getByRole('heading', { name: 'Outubro 2026' })).toBeInTheDocument();
  });
});
