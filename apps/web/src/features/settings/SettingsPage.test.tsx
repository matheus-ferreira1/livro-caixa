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

function setup() {
  const writes: Write[] = [];
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    const body: unknown = init.body ? JSON.parse(String(init.body)) : undefined;
    if (method === 'GET' && url === '/api/categories')
      return { status: 200, body: { categories: CATEGORIES, usage: { 'c-mercado': 3, 'c-salario': 1 } } };
    if (method === 'GET' && url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 40 } } };
    writes.push({ method, url, body });
    if (method === 'POST') return { status: 201, body: { category: { id: 'new', ...(body as object) } } };
    if (method === 'PATCH')
      return { status: 200, body: { category: { id: 'c-mercado', ...(body as object) } } };
    if (method === 'DELETE') return { status: 204 };
    if (method === 'PUT') return { status: 200, body: { settings: body } };
    return undefined;
  });
  const view = renderRoutes([{ path: '/configuracoes', element: <SettingsPage /> }], '/configuracoes');
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
});
