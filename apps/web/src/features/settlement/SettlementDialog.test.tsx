import type { Transaction } from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { mockApi, renderWithRoute } from '@/test/render';
import { SettlementDialog } from './SettlementDialog';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'x',
  date: '2026-10-01',
  description: 'Condomínio',
  note: '',
  type: 'despesa',
  categoryId: 'c-moradia',
  valueCents: 69_000,
  split: true,
  confirmed: true,
  recurring: false,
  seriesId: null,
  ...overrides,
});

const OCTOBER = [
  tx({ id: 'cond' }),
  tx({ id: 'feira', date: '2026-10-30', description: 'Feira', valueCents: 18_640, confirmed: false }),
  tx({ id: 'luz', description: 'Luz', split: false, valueCents: 20_000 }),
  tx({ id: 'ac', type: 'acerto', categoryId: null, split: false, valueCents: 20_000 }),
];

function setup(transactions: Transaction[] = OCTOBER) {
  const posts: unknown[] = [];
  mockApi((url, init) => {
    if (url === '/api/categories')
      return {
        status: 200,
        body: { categories: [{ id: 'c-moradia', name: 'Moradia', type: 'despesa', color: '#EB6834' }] },
      };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 50 } } };
    if (url === '/api/transactions?month=2026-10') return { status: 200, body: { transactions } };
    if (url === '/api/transactions' && init.method === 'POST') {
      posts.push(JSON.parse(String(init.body)));
      return { status: 201, body: { transaction: tx({ id: 'new', type: 'acerto' }) } };
    }
    return undefined;
  });
  const onClose = vi.fn();
  const view = renderWithRoute(<SettlementDialog month="2026-10" open onClose={onClose} />);
  return { ...view, posts, onClose };
}

const dialog = () => screen.getByRole('dialog', { name: 'Acerto de contas' });

describe('SettlementDialog', () => {
  test('summarizes the split bills of the month for the partner', async () => {
    setup();
    expect(await screen.findByText('Feira')).toBeInTheDocument();
    expect(dialog()).toHaveTextContent('Outubro 2026 · contas divididas com Bia');
    expect(screen.getByText('01/10 · Moradia')).toBeInTheDocument();
    expect(screen.getByText('30/10 · Moradia · previsto')).toBeInTheDocument();
    expect(screen.queryByText('Luz')).not.toBeInTheDocument();
    // 50% of (690 + 186,40) = 438,20, minus 200 received
    expect(dialog()).toHaveTextContent('Valor a acertar por BiaR$ 238,20');
    expect(dialog()).toHaveTextContent('Já recebido− R$ 200,00');
    expect(dialog()).toHaveTextContent('Divisão 50% / 50% · 2 contas · inclui previstas');
  });

  test('can leave pending bills out', async () => {
    const { user } = setup();
    await screen.findByText('Feira');
    await user.click(screen.getByRole('checkbox', { name: /Incluir contas previstas/ }));
    expect(screen.queryByText('Feira')).not.toBeInTheDocument();
    expect(dialog()).toHaveTextContent('Valor a acertar por BiaR$ 145,00');
    expect(dialog()).toHaveTextContent('1 contas · só confirmadas');
  });

  test('copies the share text and links it to WhatsApp', async () => {
    const { user } = setup();
    await screen.findByText('Feira');
    await user.click(screen.getByRole('button', { name: 'Copiar texto' }));
    expect(screen.getByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain('*Acerto de contas — Outubro 2026*');
    expect(screen.getByRole('link', { name: 'Enviar no WhatsApp' })).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(copied)}`,
    );
  });

  test('explains how to copy by hand when the clipboard fails', async () => {
    const { user } = setup();
    await screen.findByText('Feira');
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Copiar texto' }));
    expect(
      await screen.findByText('Não foi possível copiar automaticamente. Selecione o texto acima e copie.'),
    ).toBeInTheDocument();
  });

  test('registers the balance as a pending acerto', async () => {
    const { user, posts, onClose } = setup();
    await screen.findByText('Feira');
    await user.click(screen.getByRole('button', { name: /^Registrar acerto de R\$\s238,20$/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts).toEqual([
      {
        date: '2026-10-31',
        description: 'Acerto das contas divididas',
        note: 'Bia · 2 contas de Outubro 2026',
        type: 'acerto',
        categoryId: null,
        valueCents: 23_820,
        split: false,
        confirmed: false,
        recurring: false,
      },
    ]);
    expect(
      await screen.findByText('Acerto registrado como previsto. Confirme quando receber.'),
    ).toBeInTheDocument();
  });

  test('has nothing to register in a month without split bills', async () => {
    setup([]);
    expect(await screen.findByText('Nenhuma conta dividida neste mês.')).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'Acerto do mês já registrado' })).toBeDisabled();
  });
});
