import { MONTHLY_RECURRENCE, type Transaction } from '@livro-caixa/domain';
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
  recurrence: MONTHLY_RECURRENCE,
  seriesId: 's-luz',
};

function setup({ weekly = false }: { weekly?: boolean } = {}) {
  const writes: { method: string; url: string; body: Record<string, unknown> }[] = [];
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    if (url === '/api/categories') return { status: 200, body: { categories: CATEGORIES } };
    if (url === '/api/settings')
      return { status: 200, body: { settings: { partnerName: 'Bia', partnerShare: 40 } } };
    if (method === 'GET' && url === '/api/transactions?month=2026-10')
      return { status: 200, body: { transactions: [weekly ? { ...LUZ, recurrence: { frequency: 'weekly', weekdays: [1, 5] } } : LUZ] } };
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
        recurrence: MONTHLY_RECURRENCE,
      },
    });
    expect(await screen.findByText('Lançamento adicionado')).toBeInTheDocument();
    // The month switch is a router navigation, so it can render after the toast.
    expect(await screen.findByRole('heading', { name: 'Novembro 2026' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

test('links to Configurações to manage categories', async () => {
  const { user } = setup();
  await screen.findByText('Conta de luz');
  await user.click(screen.getByRole('button', { name: 'Novo lançamento' }));
  expect(within(dialog()).getByRole('link', { name: 'Gerenciar categorias' })).toHaveAttribute(
    'href',
    '/configuracoes',
  );
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

describe('Frequência semanal', () => {
  const openNew = async () => {
    const view = setup();
    await view.user.click(await screen.findByRole('button', { name: 'Novo lançamento' }));
    return { ...view, sheet: dialog() };
  };
  const fillRequired = async (
    user: ReturnType<typeof setup>['user'],
    sheet: HTMLElement,
    date = '2026-11-06',
  ) => {
    const field = within(sheet).getByLabelText('Data');
    await user.clear(field);
    await user.type(field, date);
    await user.type(within(sheet).getByLabelText('Valor (R$)'), '50');
    await user.type(within(sheet).getByLabelText('Descrição'), 'Feira');
  };
  const chip = (sheet: HTMLElement, name: string) => within(sheet).getByRole('button', { name });

  test('the frequency segment appears only when Recorrente is checked', async () => {
    const { user, sheet } = await openNew();
    expect(within(sheet).queryByRole('radiogroup', { name: 'Frequência' })).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    expect(within(sheet).getByRole('radiogroup', { name: 'Frequência' })).toBeInTheDocument();
    expect(within(sheet).getByRole('radio', { name: 'Mensal' })).toBeChecked();
    expect(within(sheet).queryByRole('group', { name: 'Dias da semana' })).not.toBeInTheDocument();
  });

  test('Semanal pre-selects the weekday of the date, in calendar order', async () => {
    const { user, sheet } = await openNew();
    await fillRequired(user, sheet, '2026-11-06');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    const group = within(sheet).getByRole('group', { name: 'Dias da semana' });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
      'domingo',
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado',
    ]);
    expect(chips.map((c) => c.textContent)).toEqual(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']);
    expect(chip(sheet, 'sexta-feira')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(sheet, 'segunda-feira')).toHaveAttribute('aria-pressed', 'false');
  });

  test('the recurring description follows the frequency', async () => {
    const { user, sheet } = await openNew();
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    expect(within(sheet).getByRole('checkbox', { name: 'Recorrente' })).toHaveAccessibleDescription(
      /todo mês/,
    );
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    expect(within(sheet).getByRole('checkbox', { name: 'Recorrente' })).toHaveAccessibleDescription(
      /toda semana/,
    );
  });

  test('saves the chosen weekdays', async () => {
    const { user, sheet, writes } = await openNew();
    await fillRequired(user, sheet, '2026-11-06');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    await user.click(chip(sheet, 'segunda-feira'));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({
      recurring: true,
      recurrence: { frequency: 'weekly', weekdays: [1, 5] },
    });
  });

  test('asks for at least one weekday', async () => {
    const { user, sheet, writes } = await openNew();
    await fillRequired(user, sheet, '2026-11-06');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    await user.click(chip(sheet, 'sexta-feira'));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Escolha ao menos um dia da semana.');
    expect(writes).toHaveLength(0);
  });

  test('changing the date later does not move the chips', async () => {
    const { user, sheet } = await openNew();
    await fillRequired(user, sheet, '2026-11-06');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    const date = within(sheet).getByLabelText('Data');
    await user.clear(date);
    await user.type(date, '2026-11-09');
    expect(chip(sheet, 'sexta-feira')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(sheet, 'segunda-feira')).toHaveAttribute('aria-pressed', 'false');
  });

  test('unchecking Recorrente saves the entry as monthly', async () => {
    const { user, sheet, writes } = await openNew();
    await fillRequired(user, sheet, '2026-11-06');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Semanal' }));
    await user.click(within(sheet).getByRole('checkbox', { name: 'Recorrente' }));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar lançamento' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({ recurring: false, recurrence: { frequency: 'monthly' } });
  });

  test('editing a weekly entry pre-fills the frequency and weekdays', async () => {
    const { user } = setup({ weekly: true });
    await user.click(await screen.findByRole('button', { name: 'Editar Conta de luz' }));
    const sheet = dialog();
    expect(within(sheet).getByRole('radio', { name: 'Semanal' })).toBeChecked();
    expect(chip(sheet, 'segunda-feira')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(sheet, 'sexta-feira')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(sheet, 'terça-feira')).toHaveAttribute('aria-pressed', 'false');
  });
});
