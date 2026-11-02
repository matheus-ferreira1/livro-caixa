import {
  monthName,
  monthOf,
  todayIso,
  yearSummary,
  type SummaryMode,
  type Transaction,
} from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { SummaryPage } from './SummaryPage';

const SHARE = 50;

const entry = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  date: '2026-03-10',
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

const ENTRIES = [
  entry({ date: '2026-02-05', type: 'receita', valueCents: 500_000 }),
  entry({ date: '2026-03-10', valueCents: 10_000, split: true, confirmed: false }),
];

function setup(path: string, entries: Transaction[] = ENTRIES) {
  const requests: string[] = [];
  mockApi((url) => {
    requests.push(url);
    const { searchParams } = new URL(url, 'http://localhost');
    const mode = (searchParams.get('mode') ?? 'real') as SummaryMode;
    return { status: 200, body: yearSummary(entries, Number(searchParams.get('year')), mode, SHARE) };
  });
  return {
    requests,
    ...renderRoutes(
      [
        { path: '/resumo', element: <SummaryPage /> },
        { path: '/lancamentos', element: <h1>Lançamentos</h1> },
      ],
      path,
    ),
  };
}

const monthRow = (name: string) => screen.findByRole('row', { name: new RegExp(`^${name}`) });

describe('SummaryPage', () => {
  test('opens on the current year by default', async () => {
    const year = todayIso().slice(0, 4);
    const { requests } = setup('/resumo');
    expect(await screen.findByRole('heading', { level: 1, name: year })).toBeInTheDocument();
    await waitFor(() => expect(requests).toContain(`/api/summary?year=${year}&mode=real`));
  });

  test('ignores a malformed year in the URL', async () => {
    const year = todayIso().slice(0, 4);
    setup('/resumo?ano=abc');
    expect(await screen.findByRole('heading', { level: 1, name: year })).toBeInTheDocument();
  });

  test('shows the year in the URL with its tiles', async () => {
    setup('/resumo?ano=2026');
    expect(screen.getByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument();
    const income = await screen.findByRole('region', { name: 'Receitas no ano' });
    expect(income).toHaveTextContent('R$ 5.000,00');
    expect(income).toHaveTextContent('Mais R$ 0,00 em acertos');
    expect(screen.getByRole('region', { name: 'Acumulado no ano' })).toHaveTextContent(
      'Melhor mês: Fevereiro (R$ 5.000,00)',
    );
  });

  test('explains an empty year', async () => {
    setup('/resumo?ano=2026', []);
    expect(await screen.findByText('Nenhum mês com lançamentos')).toBeInTheDocument();
    expect(screen.getByText('Sem lançamentos no ano')).toBeInTheDocument();
    expect(screen.queryAllByRole('img', { name: /balanço de/ })).toHaveLength(0);
  });

  test('the mode control changes the request, the hint and the URL', async () => {
    const { user, requests, router } = setup('/resumo?ano=2026');
    expect(await screen.findByText('Só lançamentos confirmados.')).toBeInTheDocument();
    expect(within(await monthRow('Março')).getAllByText('—').length).toBeGreaterThan(0);

    const modes = screen.getByRole('radiogroup', { name: 'Valores considerados' });
    await user.click(within(modes).getByRole('radio', { name: 'Com previstos' }));

    expect(
      await screen.findByText('Inclui previstos e o acerto esperado das contas divididas.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(requests).toContain('/api/summary?year=2026&mode=proj'));
    await waitFor(() => expect(screen.getByRole('row', { name: /^Março/ })).toHaveTextContent('−R$ 50,00'));
    expect(router.state.location.search).toBe('?ano=2026&modo=proj');
  });

  test('moves between years', async () => {
    const { user, requests, router } = setup('/resumo?ano=2026');
    await user.click(screen.getByRole('button', { name: 'Próximo ano' }));
    expect(await screen.findByRole('heading', { level: 1, name: '2027' })).toBeInTheDocument();
    await waitFor(() => expect(requests).toContain('/api/summary?year=2027&mode=real'));
    expect(router.state.location.search).toBe('?ano=2027');

    await user.click(screen.getByRole('button', { name: 'Ano anterior' }));
    await user.click(screen.getByRole('button', { name: 'Ano anterior' }));
    expect(await screen.findByRole('heading', { level: 1, name: '2025' })).toBeInTheDocument();
  });

  test('the table shows each month’s status and the year total', async () => {
    setup('/resumo?ano=2026');
    expect(await monthRow('Janeiro')).toHaveTextContent('Sem lançamentos');
    expect(await monthRow('Fevereiro')).toHaveTextContent('Fechado');
    expect(await monthRow('Março')).toHaveTextContent('Em aberto');
    const total = await screen.findByRole('row', { name: /^Total 2026/ });
    expect(total).toHaveTextContent('R$ 5.000,00');
  });

  test('flags the current month', async () => {
    const month = monthOf(todayIso());
    setup(`/resumo?ano=${month.slice(0, 4)}`, []);
    expect(within(await monthRow(monthName(month))).getByText('Atual')).toBeInTheDocument();
  });

  test('draws a labeled bar for a month with data', async () => {
    setup('/resumo?ano=2026');
    expect(
      await screen.findByRole('img', { name: 'Fevereiro: balanço de R$\u00a05.000,00' }),
    ).toBeInTheDocument();
  });

  test('a month’s link opens its entries', async () => {
    const { user, router } = setup('/resumo?ano=2026');
    await user.click(await screen.findByRole('link', { name: 'Ver lançamentos de Março' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lancamentos'));
    expect(router.state.location.search).toBe('?mes=2026-03');
  });
});
