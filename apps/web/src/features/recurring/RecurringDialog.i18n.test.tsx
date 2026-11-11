import type { RecurringCandidate, Transaction } from '@livro-caixa/domain';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { mockApi, renderWithRoute } from '@/test/render';
import { RecurringDialog } from './RecurringDialog';

const source: Transaction = {
  id: 'src',
  date: '2026-10-15',
  description: 'Internet fibra',
  note: '',
  type: 'despesa',
  categoryId: 'c-internet',
  valueCents: 123_456,
  split: true,
  confirmed: true,
  recurring: true,
  seriesId: 's-net',
};

const CANDIDATES: RecurringCandidate[] = [
  { seriesId: 's-net', date: '2026-11-15', valueCents: source.valueCents, source },
];

function setup() {
  const posts: unknown[] = [];
  mockApi((url, init) => {
    if (url === '/api/categories')
      return {
        status: 200,
        body: { categories: [{ id: 'c-internet', name: 'Internet', type: 'despesa', color: '#6250D6' }] },
      };
    if (url === '/api/recurring/candidates?month=2026-11')
      return { status: 200, body: { candidates: CANDIDATES } };
    if (url === '/api/recurring/generate' && init.method === 'POST') {
      posts.push(JSON.parse(String(init.body)));
      return { status: 201, body: { transactions: [source] } };
    }
    return undefined;
  });
  const onClose = vi.fn();
  const view = renderWithRoute(<RecurringDialog month="2026-11" open onClose={onClose} />, '/', {
    preferences: { language: 'en', currency: 'USD' },
  });
  return { ...view, posts, onClose };
}

describe('RecurringDialog in English with US dollars', () => {
  test('lists the suggestions with English copy and a dot-decimal value', async () => {
    setup();
    expect(await screen.findByText('Internet fibra')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Generate recurring entries' });
    expect(dialog).toHaveTextContent('November 2026 · from the latest occurrence of each recurring entry');
    expect(dialog).toHaveTextContent('Entries come in as pending, without a note.');
    expect(screen.getByText('Internet · split')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount of Internet fibra')).toHaveValue('1234.56');
    expect(dialog).toHaveTextContent('$1,234.56 · 15/10');
    expect(dialog).toHaveTextContent('1 of 1 selected');
  });

  test('reads a typed amount in the currency format and generates', async () => {
    const { user, posts, onClose } = setup();
    const value = await screen.findByLabelText('Amount of Internet fibra');
    await user.clear(value);
    await user.type(value, '2,000.50');
    await user.click(screen.getByRole('button', { name: 'Generate 1 entry' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toEqual([
      { month: '2026-11', items: [{ seriesId: 's-net', date: '2026-11-15', valueCents: 200_050 }] },
    ]);
    expect(await screen.findByText('1 entry generated as pending')).toBeInTheDocument();
  });

  test('names the row to review in English', async () => {
    const { user } = setup();
    const value = await screen.findByLabelText('Amount of Internet fibra');
    await user.clear(value);
    await user.click(screen.getByRole('button', { name: 'Generate 1 entry' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Review “Internet fibra”: the date must be in November 2026 and the amount greater than zero.',
    );
  });
});
