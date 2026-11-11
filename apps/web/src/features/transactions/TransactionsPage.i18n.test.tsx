import type { Preferences, Transaction } from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { TransactionsPage } from './TransactionsPage';

const CATEGORIES = [
  { id: 'c-salario', name: 'Salário', type: 'receita', color: '#2A78D6' },
  { id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#1BAF7A' },
];

const entry = (overrides: Partial<Transaction>): Transaction => ({
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
  entry({
    id: 'sal',
    date: '2026-10-05',
    description: 'Salário',
    type: 'receita',
    categoryId: 'c-salario',
    valueCents: 123_456,
    recurring: true,
  }),
  entry({ id: 'feira', date: '2026-10-30', description: 'Feira', split: true, confirmed: false }),
];

function setup(preferences: Preferences) {
  const writes: Record<string, unknown>[] = [];
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    if (url === '/api/categories') return { status: 200, body: { categories: CATEGORIES } };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 50, ...preferences } } };
    if (url.startsWith('/api/transactions?month=2026-10'))
      return { status: 200, body: { transactions: OCTOBER } };
    if (url.startsWith('/api/transactions?month=')) return { status: 200, body: { transactions: [] } };
    if (url.startsWith('/api/recurring/candidates')) return { status: 200, body: { candidates: [] } };
    if (method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      writes.push(body);
      return { status: 201, body: { transaction: { ...body, id: 'new', seriesId: null } } };
    }
    return undefined;
  });
  const view = renderRoutes(
    [{ path: '/lancamentos', element: <TransactionsPage /> }],
    '/lancamentos?mes=2026-10',
    { preferences },
  );
  return { ...view, writes };
}

describe('TransactionsPage in English with US dollars', () => {
  test('shows English copy and dot-decimal amounts', async () => {
    setup({ language: 'en', currency: 'USD' });
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(await screen.findByText('Feira')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'New entry' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Income' })).toHaveTextContent('$1,234.56');
    expect(screen.getByRole('region', { name: 'Income' })).toHaveTextContent('Pending this month: $1,234.56');
    expect(screen.getByRole('region', { name: 'Settlement to receive' })).toHaveTextContent(
      'Received from Bia: $0.00',
    );
    expect(screen.getByRole('button', { name: 'Pending, click to toggle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Split bill: yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by date, descending' })).toBeInTheDocument();
    expect(screen.getByText('2 of 2 entries')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Expenses' })).toBeInTheDocument();
  });

  test('reads an amount typed with a dot as decimal mark', async () => {
    const { user, writes } = setup({ language: 'en', currency: 'USD' });
    await user.click(await screen.findByRole('button', { name: 'New entry' }));
    const sheet = screen.getByRole('dialog', { name: /entry/ });
    expect(within(sheet).getByRole('heading', { name: 'New entry' })).toBeInTheDocument();
    await user.type(within(sheet).getByLabelText('Amount ($)'), '1,234.56');
    await user.type(within(sheet).getByLabelText('Description'), 'Repair');
    await user.click(within(sheet).getByRole('button', { name: 'Add entry' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ valueCents: 123_456, description: 'Repair', type: 'despesa' });
  });

  test('says what is wrong in English', async () => {
    const { user } = setup({ language: 'en', currency: 'USD' });
    await user.click(await screen.findByRole('button', { name: 'New entry' }));
    const sheet = screen.getByRole('dialog', { name: /entry/ });
    await user.click(within(sheet).getByRole('button', { name: 'Add entry' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Enter the description.');
  });
});

describe('TransactionsPage in mixed states', () => {
  test('keeps pt-BR copy with dollars', async () => {
    setup({ language: 'pt-BR', currency: 'USD' });
    expect(await screen.findByText('Feira')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Receitas' })).toHaveTextContent('$1,234.56');
    expect(screen.getByRole('button', { name: 'Novo lançamento' })).toBeInTheDocument();
  });

  test('keeps reais with English copy', async () => {
    const { user } = setup({ language: 'en', currency: 'BRL' });
    expect(await screen.findByText('Feira')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Income' })).toHaveTextContent('R$ 1.234,56');
    await user.click(screen.getByRole('button', { name: 'New entry' }));
    expect(screen.getByLabelText('Amount (R$)')).toBeInTheDocument();
  });
});
