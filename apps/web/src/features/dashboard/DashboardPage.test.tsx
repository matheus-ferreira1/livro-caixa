import {
  buildDashboard,
  DEFAULT_PREFERENCES,
  translator,
  monthLabel,
  monthOf,
  todayIso,
  type Preferences,
  type RecurringCandidate,
  type SummaryMode,
  type Transaction,
} from '@livro-caixa/domain';
import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { DashboardPage } from './DashboardPage';

const MONTH = '2026-03';
const SETTINGS = { partnerName: 'Bia', partnerShare: 50 };

const entry = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  date: `${MONTH}-10`,
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

function setup(
  path: string,
  {
    entries = [],
    candidates = [],
    preferences = DEFAULT_PREFERENCES,
  }: { entries?: Transaction[]; candidates?: RecurringCandidate[]; preferences?: Preferences } = {},
) {
  const { language } = preferences;
  const ledger = [...entries];
  const dashboardRequests: string[] = [];
  const patches: { url: string; body: unknown }[] = [];
  const fetchMock = mockApi((url, init) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost');
    if (init.method === 'PATCH') {
      patches.push({ url: pathname, body: JSON.parse(String(init.body)) });
      const target = ledger.find((t) => pathname.endsWith(t.id));
      if (target) target.confirmed = true;
      return { status: 200, body: { transaction: target } };
    }
    if (pathname === '/api/dashboard') {
      dashboardRequests.push(url);
      return {
        status: 200,
        body: buildDashboard({
          transactions: ledger,
          categories: [],
          settings: SETTINGS,
          month: searchParams.get('month') ?? '',
          mode: (searchParams.get('mode') ?? 'real') as SummaryMode,
          t: translator(language),
        }),
      };
    }
    if (pathname === '/api/recurring/candidates') return { status: 200, body: { candidates } };
    if (pathname === '/api/transactions') return { status: 200, body: { transactions: ledger } };
    if (pathname === '/api/categories') return { status: 200, body: { categories: [], usage: {} } };
    if (pathname === '/api/settings') return { status: 200, body: { settings: SETTINGS } };
    return undefined;
  });
  const respond = fetchMock.getMockImplementation();
  /** Keeps dashboard responses waiting until the returned function is called. */
  const holdNextDashboard = () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).startsWith('/api/dashboard')) await gate;
      if (!respond) throw new Error('fetch is not mocked');
      return respond(input, init);
    });
    return release;
  };
  return {
    dashboardRequests,
    patches,
    holdNextDashboard,
    ...renderRoutes(
      [
        { path: '/visao-geral', element: <DashboardPage /> },
        { path: '/lancamentos', element: <h1>Lançamentos</h1> },
        { path: '/resumo', element: <h1>Resumo</h1> },
      ],
      path,
      { preferences },
    ),
  };
}

const tile = (label: string) => screen.findByRole('region', { name: label });

describe('DashboardPage', () => {
  test('opens on the current month in "Realizado" by default', async () => {
    const month = monthOf(todayIso());
    const { dashboardRequests } = setup('/visao-geral');
    expect(
      await screen.findByRole('heading', { level: 1, name: monthLabel(month, translator('pt-BR')) }),
    ).toBeInTheDocument();
    await waitFor(() => expect(dashboardRequests).toEqual([`/api/dashboard?month=${month}&mode=real`]));
    expect(screen.getByRole('radio', { name: 'Realizado' })).toBeChecked();
    expect(screen.getByText('Só lançamentos confirmados.')).toBeInTheDocument();
  });

  test('reads the month and the mode from the URL', async () => {
    const { dashboardRequests } = setup(`/visao-geral?mes=${MONTH}&modo=proj`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Março 2026' })).toBeInTheDocument();
    await waitFor(() => expect(dashboardRequests).toEqual([`/api/dashboard?month=${MONTH}&mode=proj`]));
    expect(screen.getByRole('radio', { name: 'Com previstos' })).toBeChecked();
    expect(screen.getByText('Inclui previstos e o acerto esperado.')).toBeInTheDocument();
  });

  test('moves between months and modes, keeping them in the URL', async () => {
    const { user, router, dashboardRequests } = setup(`/visao-geral?mes=${MONTH}`);
    await screen.findByRole('heading', { level: 1, name: 'Março 2026' });

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Abril 2026' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?mes=2026-04');

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(router.state.location.search).toBe('?mes=2026-02');

    await user.click(screen.getByRole('radio', { name: 'Com previstos' }));
    expect(router.state.location.search).toBe('?mes=2026-02&modo=proj');
    await waitFor(() => expect(dashboardRequests.at(-1)).toBe('/api/dashboard?month=2026-02&mode=proj'));
  });

  test('shows the KPI tiles with their hints and deltas', async () => {
    setup(`/visao-geral?mes=${MONTH}`, {
      entries: [entry({ type: 'receita', valueCents: 100_000 }), entry({ valueCents: 40_000 })],
    });
    const balance = within(await tile('Balanço do mês'));
    expect(balance.getByText('R$ 600,00')).toBeInTheDocument();
    expect(balance.getByText('Receitas + acertos − despesas')).toBeInTheDocument();
    expect(balance.getByText('Sem dados de Fevereiro')).toBeInTheDocument();
    expect(within(await tile('Taxa de poupança')).getByText('60%')).toBeInTheDocument();
    expect(
      within(await tile('Gasto líquido')).getByText('Despesas menos o acerto de Bia'),
    ).toBeInTheDocument();
    expect(within(await tile('Acumulado no ano')).getByText('Janeiro a Março de 2026')).toBeInTheDocument();
  });

  test('"Ver tabela" opens the Resumo of the year, in the same mode', async () => {
    const { user, router } = setup(`/visao-geral?mes=${MONTH}&modo=proj`);
    await user.click(await screen.findByRole('link', { name: 'Ver tabela' }));
    expect(await screen.findByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?ano=2026&modo=proj');
  });

  test('the bars show a tooltip on hover', async () => {
    const { user } = setup(`/visao-geral?mes=${MONTH}`, {
      entries: [entry({ type: 'receita', valueCents: 100_000 })],
    });
    const bars = await screen.findByRole('img', { name: /^Março 2026: receitas/ });
    await user.hover(bars);
    expect(within(bars).getByText('Balanço')).toBeInTheDocument();

    const empty = screen.getByRole('img', { name: /^Fevereiro 2026: receitas/ });
    await user.hover(empty);
    expect(within(empty).getByText('Sem lançamentos')).toBeInTheDocument();
  });

  test('the bars show the tooltip on keyboard focus too', async () => {
    setup(`/visao-geral?mes=${MONTH}`);
    const first = await screen.findByRole('img', { name: /^Abril 2025: receitas/ });
    act(() => first.focus());
    await waitFor(() => expect(within(first).getByText('Sem lançamentos')).toBeInTheDocument());
    act(() => first.blur());
    await waitFor(() => expect(within(first).queryByText('Sem lançamentos')).not.toBeInTheDocument());
  });

  test('while another month loads, the cards name the month of the data they still show', async () => {
    const { user, holdNextDashboard } = setup(`/visao-geral?mes=${MONTH}`);
    await screen.findByText('Nada pendente em Março 2026.');
    const release = holdNextDashboard();
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Abril 2026' })).toBeInTheDocument();
    expect(screen.getByText('Nada pendente em Março 2026.')).toBeInTheDocument();
    act(release);
    expect(await screen.findByText('Nada pendente em Abril 2026.')).toBeInTheDocument();
  });

  test('the donut shows the total, and a category on hover', async () => {
    const { user } = setup(`/visao-geral?mes=${MONTH}`, { entries: [entry({ valueCents: 40_000 })] });
    const section = within(await screen.findByRole('region', { name: 'Despesas por categoria' }));
    expect(section.getByText('Março 2026 · comparado à média dos 12 meses anteriores')).toBeInTheDocument();
    expect(section.getByText('Total de despesas')).toBeInTheDocument();
    expect(section.getByText('1 lançamento')).toBeInTheDocument();

    await user.hover(section.getByRole('button', { name: /Sem categoria/ }));
    expect(section.getByText('100% das despesas')).toBeInTheDocument();
    expect(section.queryByText('Total de despesas')).not.toBeInTheDocument();
  });

  test('the donut has an empty state', async () => {
    setup(`/visao-geral?mes=${MONTH}`);
    expect(await screen.findByText('Nenhuma despesa em Março 2026 com o filtro atual.')).toBeInTheDocument();
  });

  test('"Em aberto" has an empty state', async () => {
    setup(`/visao-geral?mes=${MONTH}`);
    expect(await screen.findByText('Nada pendente em Março 2026.')).toBeInTheDocument();
    expect(screen.getByText('Tudo confirmado')).toBeInTheDocument();
  });

  test('"Confirmar" confirms the entry, tells the user and refreshes the page', async () => {
    const light = entry({ description: 'Conta de luz', confirmed: false });
    const { user, patches } = setup(`/visao-geral?mes=${MONTH}`, { entries: [light] });
    await user.click(await screen.findByRole('button', { name: 'Confirmar Conta de luz' }));
    await waitFor(() =>
      expect(patches).toEqual([{ url: `/api/transactions/${light.id}`, body: { confirmed: true } }]),
    );
    expect(await screen.findByText('“Conta de luz” confirmado')).toBeInTheDocument();
    expect(await screen.findByText('Nada pendente em Março 2026.')).toBeInTheDocument();
  });

  test('"Ver mais" opens Lançamentos filtered to Previstos', async () => {
    const entries = ['11', '12', '13', '14', '15', '16'].map((day) =>
      entry({ date: `${MONTH}-${day}`, confirmed: false }),
    );
    const { user, router } = setup(`/visao-geral?mes=${MONTH}`, { entries });
    await user.click(await screen.findByRole('link', { name: 'Ver mais 1 previsto' }));
    expect(await screen.findByRole('heading', { name: 'Lançamentos' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?mes=${MONTH}&status=pending`);
  });

  test('the recurring banner opens the review dialog in place', async () => {
    const source = entry({ recurring: true, seriesId: 's1', date: '2026-02-10' });
    const candidates = [{ seriesId: 's1', date: `${MONTH}-10`, valueCents: 10_000, source }];
    const { user, router } = setup(`/visao-geral?mes=${MONTH}`, { candidates });
    expect(await screen.findByText('1 recorrente ainda não gerado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar e gerar' }));
    expect(await screen.findByRole('dialog', { name: 'Gerar lançamentos recorrentes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/visao-geral');
  });

  test('shows no recurring banner without candidates', async () => {
    setup(`/visao-geral?mes=${MONTH}`);
    await screen.findByText('Nada pendente em Março 2026.');
    expect(screen.queryByRole('button', { name: 'Revisar e gerar' })).not.toBeInTheDocument();
  });

  test('the acerto card opens the Acerto dialog in place', async () => {
    const { user, router } = setup(`/visao-geral?mes=${MONTH}`, {
      entries: [entry({ split: true, valueCents: 10_000 })],
    });
    const card = within(await screen.findByRole('region', { name: 'Acerto com Bia' }));
    expect(card.getByText('Pendente')).toBeInTheDocument();
    expect(card.getByText('R$ 50,00')).toBeInTheDocument();
    expect(card.getByText('a receber de R$ 50,00 esperados')).toBeInTheDocument();
    expect(card.getByRole('img', { name: 'Recebido 0% do acerto' })).toBeInTheDocument();

    await user.click(card.getByRole('button', { name: 'Abrir acerto' }));
    expect(await screen.findByRole('dialog', { name: 'Acerto de contas' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/visao-geral');
  });

  test('speaks English and shows dollars when the instance is set to en and USD', async () => {
    setup('/visao-geral?mes=2026-03', {
      entries: [entry({ type: 'receita', valueCents: 123_456 })],
      preferences: { language: 'en', currency: 'USD' },
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'March 2026' })).toBeInTheDocument();
    expect(await tile('Month balance')).toHaveTextContent('$1,234.56');
    expect(screen.getByRole('heading', { name: 'Expenses by category' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'With pending' })).toBeInTheDocument();
    expect(screen.getByText('Nothing pending in March 2026.')).toBeInTheDocument();
  });
});
