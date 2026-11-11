import type { Transaction } from '@livro-caixa/domain';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { mockApi, renderWithRoute } from '@/test/render';
import { SettlementDialog } from './SettlementDialog';

const bill = (overrides: Partial<Transaction>): Transaction => ({
  id: 'x',
  date: '2026-10-01',
  description: 'Condomínio',
  note: '',
  type: 'despesa',
  categoryId: 'c-moradia',
  valueCents: 123_456,
  split: true,
  confirmed: true,
  recurring: false,
  seriesId: null,
  ...overrides,
});

function setup() {
  const posts: unknown[] = [];
  mockApi((url, init) => {
    if (url === '/api/categories')
      return {
        status: 200,
        body: { categories: [{ id: 'c-moradia', name: 'Moradia', type: 'despesa', color: '#EB6834' }] },
      };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 50 } } };
    if (url === '/api/transactions?month=2026-10')
      return {
        status: 200,
        body: {
          transactions: [
            bill({ id: 'cond' }),
            bill({
              id: 'feira',
              date: '2026-10-30',
              description: 'Feira',
              valueCents: 20_000,
              confirmed: false,
            }),
          ],
        },
      };
    if (url === '/api/transactions' && init.method === 'POST') {
      posts.push(JSON.parse(String(init.body)));
      return { status: 201, body: { transaction: bill({ id: 'new', type: 'acerto' }) } };
    }
    return undefined;
  });
  const onClose = vi.fn();
  const view = renderWithRoute(<SettlementDialog month="2026-10" open onClose={onClose} />, '/', {
    preferences: { language: 'en', currency: 'USD' },
  });
  return { ...view, posts, onClose };
}

const dialog = () => screen.getByRole('dialog', { name: 'Bill settlement' });

describe('SettlementDialog in English with US dollars', () => {
  test('summarizes the split bills with English copy and dollars', async () => {
    setup();
    expect(await screen.findByText('Feira')).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('October 2026 · bills split with Bia');
    expect(screen.getByText('30/10 · Moradia · pending')).toBeInTheDocument();
    // 50% of (1,234.56 + 200.00)
    expect(dialog()).toHaveTextContent('Amount to settle by Bia$717.28');
    expect(dialog()).toHaveTextContent('Split 50% / 50% · 2 bills · includes pending');
    expect(screen.getByText(/\*Bill settlement — October 2026\*/)).toBeInTheDocument();
  });

  test('registers the settlement with the English description', async () => {
    const { user, posts, onClose } = setup();
    await screen.findByText('Feira');
    await user.click(screen.getByRole('button', { name: 'Register settlement of $717.28' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toEqual([
      expect.objectContaining({
        description: 'Settlement of split bills',
        note: 'Bia · 2 bills from October 2026',
        valueCents: 71_728,
      }),
    ]);
    expect(
      await screen.findByText('Settlement registered as pending. Confirm when you receive it.'),
    ).toBeInTheDocument();
  });
});
