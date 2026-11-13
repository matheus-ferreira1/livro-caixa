import { onlineManager } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderRoutes } from '@/test/render';
import { SettingsPage } from './SettingsPage';

const SETTINGS = { partnerName: 'Bia', partnerShare: 40, language: 'pt-BR', currency: 'BRL' };

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('saving settings while offline', () => {
  afterEach(() => onlineManager.setOnline(true));

  test('fails promptly with the unreachable message and does not hold back the next save', async () => {
    let reachable = false;
    const puts: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
      const url = String(input);
      if (init.method === 'PUT') {
        if (!reachable) throw new TypeError('Failed to fetch');
        puts.push(JSON.parse(String(init.body)));
        return json({ settings: { ...SETTINGS, currency: 'USD' } });
      }
      if (url === '/api/settings') return json({ settings: SETTINGS });
      if (url === '/api/categories') return json({ categories: [], usage: {} });
      throw new Error(`Unexpected request: ${url}`);
    });
    const { user } = renderRoutes([{ path: '/configuracoes', element: <SettingsPage /> }], '/configuracoes');
    const currency = await screen.findByLabelText('Moeda');
    await screen.findByLabelText('Idioma');

    onlineManager.setOnline(false);
    await user.selectOptions(currency, 'USD');
    expect(
      await screen.findByText('Não foi possível falar com o servidor. Tente novamente.'),
    ).toBeInTheDocument();

    onlineManager.setOnline(true);
    reachable = true;
    await user.selectOptions(currency, 'USD');
    await waitFor(() => expect(puts).toEqual([{ currency: 'USD' }]));
  });
});
