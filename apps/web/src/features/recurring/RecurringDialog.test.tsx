import type { RecurringCandidate, Transaction } from '@livro-caixa/domain';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { mockApi, renderWithRoute } from '@/test/render';
import { RecurringDialog } from './RecurringDialog';

const source = (overrides: Partial<Transaction>): Transaction => ({
  id: 'src',
  date: '2026-10-15',
  description: 'Internet fibra',
  note: 'Fatura',
  type: 'despesa',
  categoryId: 'c-internet',
  valueCents: 11_990,
  split: true,
  confirmed: true,
  recurring: true,
  seriesId: 's-net',
  ...overrides,
});

const candidate = (s: Transaction, date: string): RecurringCandidate => ({
  seriesId: s.seriesId ?? '',
  date,
  valueCents: s.valueCents,
  source: s,
});

const CANDIDATES = [
  candidate(
    source({
      seriesId: 's-sal',
      description: 'Salário',
      type: 'receita',
      categoryId: null,
      valueCents: 850_000,
      split: false,
    }),
    '2026-11-05',
  ),
  candidate(source({}), '2026-11-15'),
];

function setup({
  candidates = CANDIDATES,
  failure,
}: { candidates?: RecurringCandidate[]; failure?: { status: number; body: unknown } } = {}) {
  const posts: unknown[] = [];
  mockApi((url, init) => {
    if (url === '/api/categories')
      return {
        status: 200,
        body: { categories: [{ id: 'c-internet', name: 'Internet', type: 'despesa', color: '#6250D6' }] },
      };
    if (url === '/api/recurring/candidates?month=2026-11') return { status: 200, body: { candidates } };
    if (url === '/api/recurring/generate' && init.method === 'POST') {
      const request = JSON.parse(String(init.body)) as { items: { seriesId: string }[] };
      posts.push(request);
      return failure ?? { status: 201, body: { transactions: request.items.map(() => source({})) } };
    }
    return undefined;
  });
  const onClose = vi.fn();
  const view = renderWithRoute(<RecurringDialog month="2026-11" open onClose={onClose} />);
  return { ...view, posts, onClose };
}

const dialog = () => screen.getByRole('dialog', { name: 'Gerar lançamentos recorrentes' });

describe('RecurringDialog', () => {
  test('lists the suggestions with their source and totals', async () => {
    setup();
    expect(await screen.findByText('Internet fibra')).toBeInTheDocument();
    expect(dialog()).toHaveTextContent(
      'Novembro 2026 · a partir da última ocorrência de cada lançamento recorrente',
    );
    expect(screen.getByText('Internet · dividida')).toBeInTheDocument();
    expect(screen.getByText('Sem categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de Internet fibra')).toHaveValue('2026-11-15');
    expect(screen.getByLabelText('Valor de Internet fibra')).toHaveValue('119,90');
    expect(dialog()).toHaveTextContent('R$ 119,90 · 15/10');
    expect(dialog()).toHaveTextContent('2 de 2 selecionados+ R$ 8.500,00− R$ 119,90');
  });

  test('generates the selected rows with the reviewed values', async () => {
    const { user, posts, onClose } = setup();
    await user.click(await screen.findByRole('checkbox', { name: 'Incluir Salário' }));
    expect(dialog()).toHaveTextContent('1 de 2 selecionados');
    const value = screen.getByLabelText('Valor de Internet fibra');
    await user.clear(value);
    await user.type(value, '129,90');
    await user.click(screen.getByRole('button', { name: 'Gerar 1 lançamento' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toEqual([
      { month: '2026-11', items: [{ seriesId: 's-net', date: '2026-11-15', valueCents: 12_990 }] },
    ]);
    expect(await screen.findByText('1 lançamento gerado como previstos')).toBeInTheDocument();
  });

  test('selects and clears every row at once', async () => {
    const { user } = setup();
    await screen.findByText('Internet fibra');
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }));
    expect(dialog()).toHaveTextContent('0 de 2 selecionados');
    expect(screen.getByRole('button', { name: 'Gerar lançamentos' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }));
    expect(screen.getByRole('button', { name: 'Gerar 2 lançamentos' })).toBeEnabled();
  });

  test('names the row to review before sending anything', async () => {
    const { user, posts } = setup();
    const value = await screen.findByLabelText('Valor de Internet fibra');
    await user.clear(value);
    await user.click(screen.getByRole('button', { name: 'Gerar 2 lançamentos' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revise “Internet fibra”: a data deve ser em Novembro 2026 e o valor maior que zero.',
    );
    expect(posts).toEqual([]);
  });

  test('shows the server error when generating fails', async () => {
    const { user } = setup({
      failure: { status: 409, body: { error: { code: 'conflict', message: 'Já gerados.' } } },
    });
    await user.click(await screen.findByRole('button', { name: 'Gerar 2 lançamentos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já gerados.');
  });

  test('says when every recurring entry is already in the month', async () => {
    setup({ candidates: [] });
    expect(await screen.findByText('Tudo em dia')).toBeInTheDocument();
    expect(
      screen.getByText('Todos os lançamentos recorrentes já estão em Novembro 2026.'),
    ).toBeInTheDocument();
  });
});
