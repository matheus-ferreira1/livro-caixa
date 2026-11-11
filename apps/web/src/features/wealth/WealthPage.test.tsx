import {
  buildWealth,
  DEFAULT_LOCALIZATION,
  monthLabel,
  monthOf,
  monthName,
  shiftMonth,
  todayIso,
  type Asset,
  type Preferences,
  type Snapshot,
} from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { WealthPage } from './WealthPage';

const { t } = DEFAULT_LOCALIZATION;

const manual = (overrides: Partial<Extract<Asset, { pricing: 'manual' }>> = {}): Asset => ({
  id: 'a-tesouro',
  institution: 'XP',
  name: 'Tesouro 27',
  assetClass: 'tesouro',
  pricing: 'manual',
  investedCents: 100_000,
  currentCents: 160_000,
  updatedAt: '2026-10-28',
  ...overrides,
});

const auto = (overrides: Partial<Extract<Asset, { pricing: 'auto' }>> = {}): Asset => ({
  id: 'a-mxrf',
  institution: 'Clear',
  name: 'MXRF11',
  assetClass: 'fii',
  pricing: 'auto',
  quantityE8: 300_000_000,
  avgPriceCents: 1025,
  priceCents: 894,
  dayChangeBps: 20,
  quotedAt: null,
  quoteFailed: false,
  updatedAt: '2026-10-28',
  ...overrides,
});

const UNAVAILABLE_NOTICE = 'Sem cotação, o ativo usa o último preço salvo. Para atualizar, edite o ativo.';

const UNQUOTED_CLASS_HINT =
  'Esta classe não tem cotação automática. Mantenha o preço atualizado aqui ou use o modo manual.';

const SNAPSHOTS: Snapshot[] = [
  { month: '2026-08', totalCents: 140_000, contributionsCents: 500 },
  { month: '2026-09', totalCents: 150_000, contributionsCents: 1000 },
];

function setup({
  assets = [],
  snapshots: closings = [],
  preferences,
}: { assets?: Asset[]; snapshots?: Snapshot[]; preferences?: Preferences } = {}) {
  const stored = [...assets];
  const snapshots = [...closings];
  const writes: { method: string; url: string; body: unknown }[] = [];
  mockApi((url, init) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost');
    const method = init.method ?? 'GET';
    if (pathname === '/api/wealth') {
      return {
        status: 200,
        body: buildWealth({ assets: stored, snapshots, today: searchParams.get('today') ?? '' }),
      };
    }
    if (pathname === '/api/wealth/closings') {
      const body = JSON.parse(String(init.body));
      writes.push({ method, url: pathname, body });
      if (body.items[0]?.flowCents === 999) {
        return { status: 409, body: { error: { code: 'conflict', message: 'Atualize a página.' } } };
      }
      snapshots.push({ month: body.month, totalCents: 1, contributionsCents: 0 });
      return { status: 201, body: { snapshot: snapshots.at(-1) } };
    }
    if (pathname.startsWith('/api/assets')) {
      const body = init.body ? JSON.parse(String(init.body)) : null;
      writes.push({ method, url: pathname, body });
      if (method === 'DELETE') {
        stored.splice(
          stored.findIndex((a) => pathname.endsWith(a.id)),
          1,
        );
        return { status: 204 };
      }
      if (body.name === 'Recusado') {
        return {
          status: 400,
          body: { error: { code: 'validation_error', message: 'Recusado pelo servidor.' } },
        };
      }
      const asset = { ...manual(), id: 'novo', ...body };
      stored.push(asset);
      return { status: method === 'POST' ? 201 : 200, body: { asset } };
    }
    return undefined;
  });
  return {
    writes,
    ...renderRoutes([{ path: '/patrimonio', element: <WealthPage /> }], '/patrimonio', { preferences }),
  };
}

const tile = (label: string) => screen.findByRole('region', { name: label });

describe('WealthPage', () => {
  test('shows the total, the asset count and the eyebrow', async () => {
    setup({ assets: [manual(), auto()], snapshots: SNAPSHOTS });
    expect(await screen.findByRole('heading', { level: 1, name: /1\.626,82/ })).toBeTruthy();
    expect(screen.getByText('Patrimônio')).toBeTruthy();
    expect(screen.getByText('2 ativos em 2 instituições')).toBeTruthy();
  });

  test('shows the four tiles of the design', async () => {
    setup({ assets: [manual()], snapshots: SNAPSHOTS });
    expect(within(await tile('Desde o fechamento de Setembro')).getByText(/\+ R\$\s100,00/)).toBeTruthy();
    expect(within(await tile('Fechamento de Setembro')).getByText(/rendimento \+ R\$\s90,00/)).toBeTruthy();
    expect(await tile('Últimos 12 meses')).toBeTruthy();
    expect(within(await tile('Resultado da carteira')).getByText('+60% de rentabilidade')).toBeTruthy();
  });

  test('explains the empty tiles before the first closing', async () => {
    setup({ assets: [manual()] });
    const last = await tile('Último fechamento');
    expect(within(last).getByText('—')).toBeTruthy();
    expect(within(last).getByText('Primeiro fechamento')).toBeTruthy();
    expect(await tile('Desde o fechamento')).toBeTruthy();
  });

  test('offers the first asset when the portfolio is empty', async () => {
    const { user } = setup();
    expect(await screen.findAllByText('Nenhum ativo na carteira.')).toHaveLength(2);
    const buttons = screen.getAllByRole('button', { name: 'Novo ativo' });
    await user.click(buttons[buttons.length - 1] as HTMLElement);
    expect(await screen.findByRole('dialog', { name: 'Novo ativo' })).toBeTruthy();
  });

  test('hides the daily column in calm mode and reveals it on request', async () => {
    const { user } = setup({ assets: [auto()], snapshots: SNAPSHOTS });
    const toggle = await screen.findByRole('button', { name: /Modo tranquilo/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Variações diárias ocultas')).toBeTruthy();
    expect(screen.queryByText('Hoje')).toBeNull();
    expect(screen.getByText('Aportes e rendimento aparecem no fechamento')).toBeTruthy();

    await user.click(toggle);

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Mostrando variações do dia')).toBeTruthy();
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('+0,2%')).toBeTruthy();
    expect(screen.getByText(/Hoje, pelas cotações:/)).toBeTruthy();
  });

  test('groups the table by class and by institution', async () => {
    const { user } = setup({ assets: [manual(), auto()], snapshots: SNAPSHOTS });
    const table = await screen.findByRole('region', { name: 'Ativos' });
    expect(within(table).getByText('Tesouro Direto')).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: 'Por instituição' }));

    expect(within(table).queryByText('Tesouro Direto', { selector: '.font-bold' })).toBeNull();
    expect(within(table).getByText('Clear', { selector: '.font-bold' })).toBeTruthy();
  });

  test('shows the age of an updated quote, with no notice', async () => {
    setup({ assets: [auto({ quotedAt: Date.now() - 12 * 60_000 })] });
    expect(await screen.findByText('Atualizada há 12 min')).toBeInTheDocument();
    expect(screen.queryByText('Cotação indisponível')).not.toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE_NOTICE)).not.toBeInTheDocument();
  });

  test('flags an unavailable quote, dates its price and explains what to do', async () => {
    setup({ assets: [auto()] });
    expect(await screen.findByText('Cotação indisponível')).toBeInTheDocument();
    expect(screen.getByText('em 28/10')).toBeInTheDocument();
    expect(screen.getByText(UNAVAILABLE_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('Cotação automática')).not.toBeInTheDocument();
  });

  test('shows a dash for an unknown result', async () => {
    setup({ assets: [manual({ investedCents: null })], snapshots: SNAPSHOTS });
    const table = await screen.findByRole('region', { name: 'Ativos' });
    expect(within(table).getAllByText('—').length).toBeGreaterThan(3);
  });

  test('creates a manual asset from the sheet', async () => {
    const { user, writes } = setup({ assets: [manual({ institution: 'Nubank' })] });
    await user.click(await screen.findByRole('button', { name: 'Novo ativo' }));
    const sheet = await screen.findByRole('dialog', { name: 'Novo ativo' });

    await user.click(within(sheet).getByRole('button', { name: 'Nubank' }));
    await user.type(within(sheet).getByLabelText('Ativo'), 'Caixinha');
    await user.type(within(sheet).getByLabelText('Valor atual (R$)'), '1.234,56');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar ativo' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      method: 'POST',
      body: { institution: 'Nubank', name: 'Caixinha', pricing: 'manual', currentCents: 123_456 },
    });
    expect(await screen.findByText('Ativo adicionado à carteira')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('points cripto and câmbio to the manual mode and warns when they are left automatic', async () => {
    const { user } = setup();
    await screen.findAllByText('Nenhum ativo na carteira.');
    await user.click(screen.getAllByRole('button', { name: 'Novo ativo' })[0] as HTMLElement);
    const sheet = await screen.findByRole('dialog', { name: 'Novo ativo' });

    expect(within(sheet).getByRole('button', { name: /Cotação automática.*FIIs e ETFs/ })).toBeTruthy();
    expect(
      within(sheet).getByRole('button', { name: /Manual, no fechamento.*cripto e câmbio/ }),
    ).toBeTruthy();

    await user.click(within(sheet).getByRole('button', { name: /Cotação automática/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Fundos imobiliários' }));
    expect(within(sheet).queryByText(UNQUOTED_CLASS_HINT)).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Cripto' }));
    expect(within(sheet).getByText(UNQUOTED_CLASS_HINT)).toBeTruthy();
  });

  test('switches the fields with the pricing mode and validates them', async () => {
    const { user, writes } = setup();
    await screen.findAllByText('Nenhum ativo na carteira.');
    await user.click(screen.getAllByRole('button', { name: 'Novo ativo' })[0] as HTMLElement);
    const sheet = await screen.findByRole('dialog', { name: 'Novo ativo' });
    await user.type(within(sheet).getByLabelText('Banco ou corretora'), 'XP');
    await user.type(within(sheet).getByLabelText('Ativo'), 'MXRF11');
    await user.click(within(sheet).getByRole('button', { name: /Cotação automática/ }));

    expect(within(sheet).queryByLabelText('Valor atual (R$)')).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar ativo' }));
    expect(within(sheet).getByRole('alert').textContent).toBe('Informe uma quantidade maior que zero.');
    expect(writes).toHaveLength(0);

    await user.type(within(sheet).getByLabelText('Quantidade'), '0,5');
    expect(within(sheet).queryByRole('alert')).toBeNull();
    await user.type(within(sheet).getByLabelText('Cotação atual (R$)'), '8,94');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar ativo' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ body: { pricing: 'auto', quantityE8: 50_000_000, priceCents: 894 } });
  });

  test('shows the server message when saving fails', async () => {
    const { user } = setup();
    await screen.findAllByText('Nenhum ativo na carteira.');
    await user.click(screen.getAllByRole('button', { name: 'Novo ativo' })[0] as HTMLElement);
    const sheet = await screen.findByRole('dialog', { name: 'Novo ativo' });
    await user.type(within(sheet).getByLabelText('Banco ou corretora'), 'XP');
    await user.type(within(sheet).getByLabelText('Ativo'), 'Recusado');
    await user.type(within(sheet).getByLabelText('Valor atual (R$)'), '10');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar ativo' }));
    expect((await within(sheet).findByRole('alert')).textContent).toBe('Recusado pelo servidor.');
  });

  test('edits an asset with its values prefilled', async () => {
    const { user, writes } = setup({ assets: [auto()], snapshots: SNAPSHOTS });
    await user.click(await screen.findByRole('button', { name: 'Editar MXRF11' }));
    const sheet = await screen.findByRole('dialog', { name: 'Editar ativo' });
    expect((within(sheet).getByLabelText('Quantidade') as HTMLInputElement).value).toBe('3');
    expect((within(sheet).getByLabelText('Cotação atual (R$)') as HTMLInputElement).value).toBe('8,94');

    await user.click(within(sheet).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ method: 'PUT', url: '/api/assets/a-mxrf' });
    expect(await screen.findByText('Ativo atualizado')).toBeTruthy();
  });

  test('removes an asset after confirming inline', async () => {
    const { user, writes } = setup({ assets: [manual()], snapshots: SNAPSHOTS });
    await user.click(await screen.findByRole('button', { name: 'Remover Tesouro 27' }));
    expect(screen.getByText('Remover “Tesouro 27” da carteira?')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Remover “Tesouro 27” da carteira?')).toBeNull();
    expect(writes).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Remover Tesouro 27' }));
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ method: 'DELETE', url: '/api/assets/a-tesouro' });
    expect(await screen.findByText('“Tesouro 27” removido da carteira')).toBeTruthy();
  });

  describe('closing', () => {
    const currentMonth = monthOf(todayIso());
    const previousMonth = shiftMonth(currentMonth, -1);
    const overdue = [{ month: shiftMonth(currentMonth, -2), totalCents: 150_000, contributionsCents: 0 }];
    const closedThisMonth = [{ month: currentMonth, totalCents: 150_000, contributionsCents: 0 }];

    test('announces an open closing', async () => {
      setup({ assets: [manual()], snapshots: overdue });
      const banner = await screen.findByRole('status');
      expect(
        within(banner).getByText(`O fechamento de ${monthLabel(previousMonth, t)} está disponível.`),
      ).toBeTruthy();
      expect(within(banner).getByRole('button', { name: 'Fazer fechamento' })).toBeTruthy();
    });

    test('says the quotes are current only when they all are', async () => {
      setup({ assets: [auto({ quotedAt: Date.now() - 60_000 })], snapshots: overdue });
      const banner = await screen.findByRole('status');
      expect(within(banner).getByText(/As cotações automáticas já estão em dia\./)).toBeTruthy();
    });

    test('warns about the quotes that are missing instead', async () => {
      setup({ assets: [auto(), auto({ id: 'a-hglg', name: 'HGLG11' })], snapshots: overdue });
      const banner = await screen.findByRole('status');
      expect(within(banner).getByText(/2 ativos sem cotação usam o último preço salvo\./)).toBeTruthy();
      expect(within(banner).queryByText(/já estão em dia/)).toBeNull();
    });

    test('uses the singular for one missing quote', async () => {
      setup({ assets: [auto()], snapshots: overdue });
      const banner = await screen.findByRole('status');
      expect(within(banner).getByText(/1 ativo sem cotação usa o último preço salvo\./)).toBeTruthy();
    });

    const openClosing = async (user: ReturnType<typeof setup>['user']) => {
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      return screen.findByRole('dialog', { name: `Fechamento de ${monthLabel(previousMonth, t)}` });
    };

    test('shows each quote status in the dialog, with nothing to do when all are current', async () => {
      const { user } = setup({ assets: [auto({ quotedAt: Date.now() - 60_000 })], snapshots: overdue });
      const dialog = await openClosing(user);
      expect(within(dialog).getByText(/Já atualizadas, nada a fazer\./)).toBeTruthy();
      expect(within(dialog).getByText('Atualizada há 1 min')).toBeTruthy();
    });

    test('tells what to do in the dialog when a quote is missing', async () => {
      const { user } = setup({ assets: [auto()], snapshots: overdue });
      const dialog = await openClosing(user);
      expect(within(dialog).queryByText(/Já atualizadas/)).toBeNull();
      expect(
        within(dialog).getByText(
          /1 ativo sem cotação usa o último preço salvo\. Para atualizar o preço, edite o ativo antes de fechar\. Compras e vendas/,
        ),
      ).toBeTruthy();
      expect(within(dialog).getByText('Cotação indisponível')).toBeTruthy();
      expect(within(dialog).getByText('em 28/10')).toBeTruthy();
    });

    test('says when the next closing opens and disables the button', async () => {
      setup({ assets: [manual()], snapshots: closedThisMonth });
      const next = shiftMonth(currentMonth, 1);
      expect(
        await screen.findByText(
          `Fechamento de ${monthLabel(currentMonth, t)} registrado. O de ${monthName(next, t)} abre em 25/${next.slice(5)} e até lá não há nada para atualizar.`,
        ),
      ).toBeTruthy();
      const button = screen.getByRole('button', { name: 'Fechamento em dia' }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    test('offers nothing to close on an empty portfolio', async () => {
      setup();
      await screen.findAllByText('Nenhum ativo na carteira.');
      expect(screen.queryByRole('status')).toBeNull();
      expect((screen.getByRole('button', { name: 'Fechamento em dia' }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });

    test('opens the first closing at once, for the previous month, with no comparison', async () => {
      const { user } = setup({ assets: [manual()] });
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: `Fechamento de ${monthLabel(previousMonth, t)}`,
      });
      expect(within(dialog).getByText('Primeiro fechamento')).toBeTruthy();
      expect(within(dialog).queryByText(/Comparado ao fechamento/)).toBeNull();
      expect(within(dialog).getByText('Variação no mês').parentElement?.textContent).toContain('—');
    });

    test('updates the totals while typing and registers the closing', async () => {
      const { user, writes } = setup({ assets: [manual(), auto()], snapshots: overdue });
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: `Fechamento de ${monthLabel(previousMonth, t)}`,
      });
      expect(within(dialog).getByText(/Comparado ao fechamento de .* \(R\$\s1\.500,00\)/)).toBeTruthy();
      expect(within(dialog).getByText('MXRF11')).toBeTruthy();

      const flow = within(dialog).getByLabelText('Aporte ou resgate em Tesouro 27');
      await user.clear(flow);
      await user.type(flow, '-50,00');
      const value = within(dialog).getByLabelText('Valor atual de Tesouro 27');
      await user.clear(value);
      await user.type(value, '1700,00');

      expect(within(dialog).getByText('Patrimônio no fechamento').parentElement?.textContent).toMatch(
        /1\.726,82/,
      );
      expect(within(dialog).getByText('Aportes').parentElement?.textContent).toMatch(/− R\$\s50,00/);
      expect(within(dialog).getByText('Rendimento').parentElement?.textContent).toMatch(/\+ R\$\s276,82/);

      await user.click(
        within(dialog).getByRole('button', {
          name: `Registrar fechamento de ${monthName(previousMonth, t)}`,
        }),
      );

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0]).toMatchObject({
        url: '/api/wealth/closings',
        body: {
          month: previousMonth,
          items: [{ assetId: 'a-tesouro', flowCents: -5000, currentCents: 170_000 }],
        },
      });
      expect(
        await screen.findByText(`Fechamento de ${monthLabel(previousMonth, t)} registrado`),
      ).toBeTruthy();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    test('names the asset to review and sends nothing', async () => {
      const { user, writes } = setup({ assets: [manual()], snapshots: overdue });
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      const dialog = await screen.findByRole('dialog');
      const value = within(dialog).getByLabelText('Valor atual de Tesouro 27');
      await user.clear(value);
      await user.type(value, 'abc');
      expect(value.getAttribute('aria-invalid')).toBe('true');

      await user.click(within(dialog).getByRole('button', { name: /Registrar fechamento/ }));

      expect(within(dialog).getByRole('alert').textContent).toBe('Revise os valores de “Tesouro 27” (XP).');
      expect(writes).toHaveLength(0);
    });

    test('marks only the field with the problem', async () => {
      const { user } = setup({ assets: [manual()], snapshots: overdue });
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      const dialog = await screen.findByRole('dialog');
      const flow = within(dialog).getByLabelText('Aporte ou resgate em Tesouro 27');
      await user.clear(flow);
      await user.type(flow, 'abc');

      expect(flow.getAttribute('aria-invalid')).toBe('true');
      expect(within(dialog).getByLabelText('Valor atual de Tesouro 27').getAttribute('aria-invalid')).toBe(
        'false',
      );
    });

    test('shows the server message when the closing is refused', async () => {
      const { user } = setup({ assets: [manual()], snapshots: overdue });
      await user.click(
        within(await screen.findByRole('status')).getByRole('button', { name: 'Fazer fechamento' }),
      );
      const dialog = await screen.findByRole('dialog');
      const flow = within(dialog).getByLabelText('Aporte ou resgate em Tesouro 27');
      await user.clear(flow);
      await user.type(flow, '9,99');
      await user.click(within(dialog).getByRole('button', { name: /Registrar fechamento/ }));
      expect((await within(dialog).findByRole('alert')).textContent).toBe('Atualize a página.');
    });
  });

  test('labels the evolution bars, marking the open month', async () => {
    setup({ assets: [manual()], snapshots: SNAPSHOTS });
    expect(await screen.findByRole('img', { name: /Setembro 2026: R\$\s1\.500,00$/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Outubro 2026: R\$\s1\.600,00, mês em aberto/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Distribuição: Tesouro Direto 100%/ })).toBeTruthy();
  });
});

describe('WealthPage in other languages and currencies', () => {
  test('speaks English and writes amounts with the dollar format', async () => {
    setup({
      assets: [manual(), auto()],
      snapshots: SNAPSHOTS,
      preferences: { language: 'en', currency: 'USD' },
    });
    expect(await screen.findByRole('heading', { level: 1, name: '$1,626.82' })).toBeTruthy();
    expect(screen.getByText('Net worth')).toBeTruthy();
    expect(screen.getByText('2 assets in 2 institutions')).toBeTruthy();
    expect(within(await tile('Portfolio result')).getByText('+57.8% return')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Calm mode Daily changes hidden' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /September 2026: \$1,500\.00$/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Allocation: Treasury bonds 98.4%/ })).toBeTruthy();
  });

  test('reads typed dollar amounts in the asset form and labels them with the symbol', async () => {
    const { user, writes } = setup({ preferences: { language: 'en', currency: 'USD' } });
    await user.click((await screen.findAllByRole('button', { name: 'New asset' }))[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'New asset' });
    await user.type(within(dialog).getByLabelText('Bank or broker'), 'Wise');
    await user.type(within(dialog).getByLabelText('Asset'), 'Savings');
    await user.type(within(dialog).getByLabelText('Invested amount ($)'), '1,000.00');
    await user.type(within(dialog).getByLabelText('Current value ($)'), '1,234.56');
    await user.click(within(dialog).getByRole('button', { name: 'Add asset' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({ investedCents: 100_000, currentCents: 123_456 });
  });

  test('keeps the real format with English words', async () => {
    const { user, writes } = setup({ preferences: { language: 'en', currency: 'BRL' } });
    await user.click((await screen.findAllByRole('button', { name: 'New asset' }))[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'New asset' });
    await user.type(within(dialog).getByLabelText('Bank or broker'), 'XP');
    await user.type(within(dialog).getByLabelText('Asset'), 'Tesouro');
    await user.type(within(dialog).getByLabelText('Current value (R$)'), '1.234,56');
    await user.click(within(dialog).getByRole('button', { name: 'Add asset' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.body).toMatchObject({ currentCents: 123_456 });
  });

  test('keeps Portuguese with dollar amounts', async () => {
    setup({ assets: [manual()], snapshots: SNAPSHOTS, preferences: { language: 'pt-BR', currency: 'USD' } });
    expect(await screen.findByRole('heading', { level: 1, name: '$1,600.00' })).toBeTruthy();
    expect(screen.getByText('1 ativo em 1 instituição')).toBeTruthy();
  });
});
