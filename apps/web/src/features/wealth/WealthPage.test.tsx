import { buildWealth, type Asset, type Snapshot } from '@livro-caixa/domain';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { WealthPage } from './WealthPage';

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
  updatedAt: '2026-10-28',
  ...overrides,
});

const SNAPSHOTS: Snapshot[] = [
  { month: '2026-08', totalCents: 140_000, contributionsCents: 500 },
  { month: '2026-09', totalCents: 150_000, contributionsCents: 1000 },
];

function setup({ assets = [], snapshots = [] }: { assets?: Asset[]; snapshots?: Snapshot[] } = {}) {
  const stored = [...assets];
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
  return { writes, ...renderRoutes([{ path: '/patrimonio', element: <WealthPage /> }], '/patrimonio') };
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

  test('labels the evolution bars, marking the open month', async () => {
    setup({ assets: [manual()], snapshots: SNAPSHOTS });
    expect(await screen.findByRole('img', { name: /Setembro 2026: R\$\s1\.500,00$/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Outubro 2026: R\$\s1\.600,00, mês em aberto/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Distribuição: Tesouro Direto 100%/ })).toBeTruthy();
  });
});
