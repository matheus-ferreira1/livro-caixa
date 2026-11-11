import type { Preferences } from '@livro-caixa/domain';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { SettingsPage } from './SettingsPage';

const CATEGORIES = [
  { id: 'c-salario', name: 'Salário', type: 'receita', color: '#2A78D6' },
  { id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#1BAF7A' },
  { id: 'c-lazer', name: 'Lazer', type: 'despesa', color: '#6250D6' },
];

type Write = { method: string; url: string; body: unknown };

interface SetupOptions {
  preferences?: Preferences;
}

function setup({ preferences }: SetupOptions = {}) {
  const writes: Write[] = [];
  let stored: Record<string, unknown> = {
    partnerName: 'Bia',
    partnerShare: 40,
    language: preferences?.language ?? 'pt-BR',
    currency: preferences?.currency ?? 'BRL',
  };
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    const body: unknown = init.body ? JSON.parse(String(init.body)) : undefined;
    if (method === 'GET' && url === '/api/categories')
      return { status: 200, body: { categories: CATEGORIES, usage: { 'c-mercado': 3, 'c-salario': 1 } } };
    if (method === 'GET' && url === '/api/settings') return { status: 200, body: { settings: stored } };
    writes.push({ method, url, body });
    if (method === 'POST') return { status: 201, body: { category: { id: 'new', ...(body as object) } } };
    if (method === 'PATCH')
      return { status: 200, body: { category: { id: 'c-mercado', ...(body as object) } } };
    if (method === 'DELETE') return { status: 204 };
    if (method === 'PUT') {
      stored = { ...stored, ...(body as object) };
      return { status: 200, body: { settings: stored } };
    }
    return undefined;
  });
  const view = renderRoutes([{ path: '/configuracoes', element: <SettingsPage /> }], '/configuracoes', {
    preferences,
  });
  return { ...view, writes };
}

const listCard = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;

describe('Configurações', () => {
  test('lists categories by type with their usage', async () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    await screen.findByText('Mercado');
    const despesas = listCard('Despesas');
    expect(within(despesas).getByText('2 categorias')).toBeInTheDocument();
    expect(within(despesas).getByText('3 lançamentos')).toBeInTheDocument();
    expect(within(despesas).getByText('Sem lançamentos')).toBeInTheDocument();
    expect(within(listCard('Receitas')).getByText('1 lançamento')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mercado está em uso e não pode ser excluída' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir Lazer' })).toBeEnabled();
  });

  test('validates the new category name', async () => {
    const { user, writes } = setup();
    await screen.findByText('Mercado');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Dê um nome para a categoria.');
    await user.type(screen.getByLabelText('Nova categoria'), 'mercado');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome nesse tipo.');
    expect(writes).toEqual([]);
  });

  test('creates a category with the chosen type and color', async () => {
    const { user, writes } = setup();
    await screen.findByText('Mercado');
    await user.type(screen.getByLabelText('Nova categoria'), 'Bônus');
    await user.click(screen.getByRole('radio', { name: 'Receita' }));
    await user.click(screen.getByRole('button', { name: 'Cor 3' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Categoria “Bônus” criada')).toBeInTheDocument();
    expect(writes).toEqual([
      { method: 'POST', url: '/api/categories', body: { name: 'Bônus', type: 'receita', color: '#1BAF7A' } },
    ]);
    expect(screen.getByLabelText('Nova categoria')).toHaveValue('');
  });

  test('renames a category inline', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Editar Mercado' }));
    const name = screen.getByLabelText('Nome');
    await user.clear(name);
    await user.type(name, 'Supermercado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria atualizada')).toBeInTheDocument();
    expect(writes).toEqual([
      { method: 'PATCH', url: '/api/categories/c-mercado', body: { name: 'Supermercado', color: '#1BAF7A' } },
    ]);
  });

  test('deletes an unused category', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Excluir Lazer' }));
    expect(await screen.findByText('Categoria “Lazer” excluída')).toBeInTheDocument();
    expect(writes).toEqual([{ method: 'DELETE', url: '/api/categories/c-lazer', body: undefined }]);
  });

  test('saves the partner split and previews it', async () => {
    const { writes } = setup();
    const slider = await screen.findByLabelText('Parte de Bia nas contas divididas');
    expect(screen.getByText(/Exemplo: numa conta dividida/)).toHaveTextContent(/Bia paga R\$\s40,00/);
    fireEvent.change(slider, { target: { value: '30' } });
    expect(screen.getByText(/Exemplo: numa conta dividida/)).toHaveTextContent(
      /Bia paga R\$\s30,00 e você paga R\$\s70,00/,
    );
    await waitFor(() =>
      expect(writes).toEqual([
        { method: 'PUT', url: '/api/settings', body: { partnerName: 'Bia', partnerShare: 30 } },
      ]),
    );
  });

  test('offers the languages in their own names and the currencies in the current language', async () => {
    setup();
    const section = (await screen.findByRole('heading', { name: 'Idioma e moeda' })).closest(
      'section',
    ) as HTMLElement;
    expect(within(section).getByText(/Os valores não são convertidos\./)).toBeInTheDocument();
    const language = within(section).getByLabelText('Idioma');
    expect(
      within(language)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Português (Brasil)', 'English']);
    const currency = within(section).getByLabelText('Moeda');
    expect(
      within(currency)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Real brasileiro (R$)', 'Dólar americano ($)', 'Euro (€)', 'Libra esterlina (£)']);
    expect(language).toHaveValue('pt-BR');
    expect(currency).toHaveValue('BRL');
  });

  test('switches the language at once and saves only the language', async () => {
    const { user, writes } = setup();
    await screen.findByText('Mercado');
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Language and currency' })).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toHaveValue('BRL');
    expect(document.documentElement.lang).toBe('en');
    expect(writes).toEqual([{ method: 'PUT', url: '/api/settings', body: { language: 'en' } }]);
  });

  test('switches the currency at once and keeps the amounts as they are', async () => {
    const { user, writes } = setup();
    await user.selectOptions(await screen.findByLabelText('Moeda'), 'USD');
    expect(await screen.findByText(/Bia paga \$40\.00 e você paga \$60\.00/)).toBeInTheDocument();
    expect(writes).toEqual([{ method: 'PUT', url: '/api/settings', body: { currency: 'USD' } }]);
    expect(screen.getByLabelText('Idioma')).toHaveValue('pt-BR');
  });

  test('keeps the language when the partner is edited afterwards', async () => {
    const { user, writes } = setup();
    await user.selectOptions(await screen.findByLabelText('Idioma'), 'en');
    const slider = await screen.findByLabelText('Bia’s share of split bills');
    fireEvent.change(slider, { target: { value: '30' } });
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]).toEqual({
      method: 'PUT',
      url: '/api/settings',
      body: { partnerName: 'Bia', partnerShare: 30 },
    });
    expect(screen.getByLabelText('Language')).toHaveValue('en');
  });

  test('keeps the partner fields when the language is changed after editing them', async () => {
    const { user, writes } = setup();
    const slider = await screen.findByLabelText('Parte de Bia nas contas divididas');
    fireEvent.change(slider, { target: { value: '30' } });
    await waitFor(() => expect(writes).toHaveLength(1));
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en');
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.body).toEqual({ language: 'en' });
    expect(screen.getByLabelText('Bia’s share of split bills')).toHaveValue('30');
  });

  test('renders in English with dollars when the instance is set that way', async () => {
    setup({ preferences: { language: 'en', currency: 'USD' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(await screen.findByText('Mercado')).toBeInTheDocument();
    const expense = listCard('Expenses');
    expect(within(expense).getByText('2 categories')).toBeInTheDocument();
    expect(within(expense).getByText('3 entries')).toBeInTheDocument();
    expect(within(expense).getByText('No entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mercado is in use and cannot be deleted' })).toBeDisabled();
    expect(screen.getByText(/Example: on a split bill of/)).toHaveTextContent(
      'Example: on a split bill of $100.00, Bia pays $40.00 and you pay $60.00.',
    );
    expect(screen.getByLabelText('Language')).toHaveValue('en');
    expect(screen.getByLabelText('Currency')).toHaveValue('USD');
  });

  test('says in English that a category needs a name', async () => {
    const { user } = setup({ preferences: { language: 'en', currency: 'USD' } });
    await screen.findByText('Mercado');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give the category a name.');
  });

  test('refetches what the server wrote in the old language when the language changes', async () => {
    const { user, queryClient } = setup();
    const dashboardKey = ['transactions', 'dashboard', '2026-03', 'real'];
    queryClient.setQueryData(dashboardKey, { partnerName: 'Companheira' });
    await user.selectOptions(await screen.findByLabelText('Moeda'), 'USD');
    await waitFor(() => expect(screen.getByLabelText('Moeda')).toHaveValue('USD'));
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(false);

    await user.selectOptions(screen.getByLabelText('Idioma'), 'en');
    await waitFor(() => expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true));
  });

  test('takes the preferences from the saved settings, not from what this client sent', async () => {
    const { user, queryClient } = setup();
    await screen.findByLabelText('Idioma');
    // Another device changed the currency after this screen loaded its settings.
    mockApi((url, init) =>
      init.method === 'PUT' && url === '/api/settings'
        ? {
            status: 200,
            body: { settings: { partnerName: 'Bia', partnerShare: 40, language: 'en', currency: 'EUR' } },
          }
        : undefined,
    );
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en');
    await waitFor(() =>
      expect(queryClient.getQueryData(['preferences'])).toEqual({ language: 'en', currency: 'EUR' }),
    );
    expect(await screen.findByLabelText('Currency')).toHaveValue('EUR');
  });
});
