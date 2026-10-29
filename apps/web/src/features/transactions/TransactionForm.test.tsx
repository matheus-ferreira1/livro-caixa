import type { Transaction } from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { TransactionsPage } from './TransactionsPage';

const CATEGORIES = [
  { id: 'c-salario', name: 'Salário', type: 'receita', color: '#2A78D6' },
  { id: 'c-cartao', name: 'Cartão de crédito', type: 'despesa', color: '#2A78D6' },
  { id: 'c-moradia', name: 'Moradia', type: 'despesa', color: '#EB6834' },
];

const LUZ: Transaction = {
  id: 'luz',
  date: '2026-10-12',
  description: 'Conta de luz',
  note: '',
  type: 'despesa',
  categoryId: 'c-moradia',
  valueCents: 24_690,
  split: true,
  confirmed: true,
  recurring: true,
  seriesId: 's-luz',
};

function setup() {
  const writes: { method: string; url: string; body: Record<string, unknown> }[] = [];
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    if (url === '/api/categories') return { status: 200, body: { categories: CATEGORIES } };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 40 } } };
    if (method === 'GET' && url === '/api/transactions?month=2026-10')
      return { status: 200, body: { transactions: [LUZ] } };
    if (method === 'GET' && url.startsWith('/api/transactions?month='))
      return { status: 200, body: { transactions: [] } };
    if (method === 'POST' || method === 'PUT') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      writes.push({ method, url, body });
      return {
        status: method === 'POST' ? 201 : 200,
        body: { transaction: { ...body, id: 'new', seriesId: null } },
      };
    }
    return undefined;
  });
  const view = renderRoutes(
    [{ path: '/lancamentos', element: <TransactionsPage /> }],
    '/lancamentos?mes=2026-10',
  );
  return { ...view, writes };
}

const dialog = () => screen.getByRole('dialog', { name: /lançamento/ });

describe('Novo lançamento', () => {
  test('opens a side sheet with the design defaults', async () => {
    const { user } = setup();
    await screen.findByText('Conta de luz');
    await user.click(screen.getByRole('button', { name: 'Novo lançamento' }));

    const sheet = dialog();
    expect(within(sheet).getByRole('heading', { name: 'Novo lançamento' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Despesa' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(sheet).getByRole('button', { name: 'Cartão de crédito' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect((within(sheet).getByLabelText('Data') as HTMLInputElement).value).toMatch(/^2026-10-\d{2}$/);
    expect(within(sheet).getByRole('checkbox', { name: 'Conta dividida' })).toHaveAccessibleDescription(
      'Entra no cálculo do acerto com Bia (40% para Bia).',
    );
    expect(within(sheet).getByRole('checkbox', { name: 'Confirmado' })).not.toBeChecked();
  });

  test('shows the first validation error and clears it on edit', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Novo lançamento' }));
    const sheet = dialog();
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Informe a descrição.');

    await user.type(within(sheet).getByLabelText('Descrição'), 'Gás');
    expect(within(sheet).queryByRole('alert')).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Informe um valor maior que zero.');
    expect(writes).toHaveLength(0);
  });

  test('acerto hides category, split and recurrence and shows the explanation', async () => {
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: 'Novo lançamento' }));
    const sheet = dialog();
    await user.click(within(sheet).getByRole('button', { name: 'Acerto' }));
    expect(within(sheet).getByText(/Acerto é o valor recebido de Bia/)).toBeInTheDocument();
    expect(within(sheet).queryByRole('group', { name: 'Categoria' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('checkbox', { name: 'Conta dividida' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('checkbox', { name: 'Recorrente' })).not.toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Receita' }));
    expect(within(sheet).getByRole('button', { name: 'Salário' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(sheet).queryByRole('checkbox', { name: 'Conta dividida' })).not.toBeInTheDocument();
  });

  test('creates the entry, toasts and jumps to its month', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Novo lançamento' }));
    const sheet = dialog();
    const date = within(sheet).getByLabelText('Data');
    await user.clear(date);
    await user.type(date, '2026-11-06');
    await user.type(within(sheet).getByLabelText('Valor (R$)'), '1.180,50');
    await user.type(within(sheet).getByLabelText('Descrição'), 'Conserto do chuveiro');
    await user.click(within(sheet).getByRole('button', { name: 'Moradia' }));
    await user.type(within(sheet).getByLabelText(/Observação/), 'Eletricista');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Conta dividida' }));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      method: 'POST',
      url: '/api/transactions',
      body: {
        date: '2026-11-06',
        description: 'Conserto do chuveiro',
        note: 'Eletricista',
        type: 'despesa',
        categoryId: 'c-moradia',
        valueCents: 118_050,
        split: true,
        confirmed: false,
        recurring: false,
      },
    });
    expect(await screen.findByText('Lançamento adicionado')).toBeInTheDocument();
    // The month switch is a router navigation, so it can render after the toast.
    expect(await screen.findByRole('heading', { name: 'Novembro 2026' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Editar lançamento', () => {
  test('prefills the entry and saves it with PUT', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Editar Conta de luz' }));
    const sheet = dialog();
    expect(within(sheet).getByRole('heading', { name: 'Editar lançamento' })).toBeInTheDocument();
    expect(within(sheet).getByLabelText('Valor (R$)')).toHaveValue('246,90');
    expect(within(sheet).getByRole('checkbox', { name: 'Recorrente' })).toBeChecked();

    const value = within(sheet).getByLabelText('Valor (R$)');
    await user.clear(value);
    await user.type(value, '250');
    await user.click(within(sheet).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(writes[0]?.method).toBe('PUT'));
    expect(writes[0]).toMatchObject({
      url: '/api/transactions/luz',
      body: { valueCents: 25_000, recurring: true, split: true },
    });
    expect(await screen.findByText('Lançamento atualizado')).toBeInTheDocument();
  });

  test('closes without saving', async () => {
    const { user, writes } = setup();
    await user.click(await screen.findByRole('button', { name: 'Editar Conta de luz' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes).toHaveLength(0);
  });
});
