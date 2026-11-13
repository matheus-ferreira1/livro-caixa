import { DEFAULT_PREFERENCES } from '@livro-caixa/domain';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PREFERENCES_KEY } from '@/shared/i18n/preferences';
import { renderRoutes } from '@/test/render';
import { SettingsPage } from './SettingsPage';

const INITIAL = { partnerName: 'Bia', partnerShare: 40, language: 'pt-BR', currency: 'BRL' };

interface HeldSave {
  body: Record<string, unknown>;
  answer: () => void;
  fail: () => void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A server whose answers to saves wait for the test; each held save merges when it is answered. */
function setupHeldServer() {
  let stored: Record<string, unknown> = INITIAL;
  const saves: HeldSave[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = String(input);
    if (init.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Promise<Response>((resolve) => {
        saves.push({
          body,
          answer: () => {
            stored = { ...stored, ...body };
            resolve(json({ settings: stored }));
          },
          fail: () => resolve(json({ error: { code: 'boom', message: 'Falhou ao salvar.' } }, 500)),
        });
      });
    }
    if (url === '/api/settings') return json({ settings: stored });
    if (url === '/api/categories') return json({ categories: [], usage: {} });
    throw new Error(`Unexpected request: ${url}`);
  });
  return saves;
}

const renderSettings = () =>
  renderRoutes([{ path: '/configuracoes', element: <SettingsPage /> }], '/configuracoes');

describe('language and currency selects while saves are pending', () => {
  test('show each pick at once, then the server values once answered', async () => {
    const saves = setupHeldServer();
    const { user } = renderSettings();
    const language = await screen.findByLabelText('Idioma');
    const currency = screen.getByLabelText('Moeda');

    await user.selectOptions(language, 'en');
    await user.selectOptions(currency, 'USD');

    expect(language).toHaveValue('en');
    expect(currency).toHaveValue('USD');

    for (let answered = 0; answered < 2; answered += 1) {
      await waitFor(() => expect(saves).toHaveLength(answered + 1));
      saves[answered]?.answer();
    }

    await waitFor(() => expect(screen.getByLabelText('Currency')).toHaveValue('USD'));
    expect(screen.getByLabelText('Language')).toHaveValue('en');
  });

  test('keep the pick while the app still shows the old language', async () => {
    setupHeldServer();
    const { user } = renderSettings();
    await user.selectOptions(await screen.findByLabelText('Idioma'), 'en');

    expect(screen.getByLabelText('Idioma')).toHaveValue('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
  });

  test('a failed save returns its select to the applied value and shows the error', async () => {
    const saves = setupHeldServer();
    const { user } = renderSettings();
    const currency = await screen.findByLabelText('Moeda');

    await user.selectOptions(currency, 'USD');
    expect(currency).toHaveValue('USD');
    await waitFor(() => expect(saves).toHaveLength(1));
    saves[0]?.fail();

    await waitFor(() => expect(currency).toHaveValue('BRL'));
    expect(await screen.findByText('Falhou ao salvar.')).toBeInTheDocument();
  });

  test('a failed save leaves the other pending pick in place', async () => {
    const saves = setupHeldServer();
    const { user } = renderSettings();
    const language = await screen.findByLabelText('Idioma');
    const currency = screen.getByLabelText('Moeda');

    await user.selectOptions(language, 'en');
    await user.selectOptions(currency, 'USD');
    await waitFor(() => expect(saves).toHaveLength(1));
    saves[0]?.fail();

    await waitFor(() => expect(language).toHaveValue('pt-BR'));
    expect(currency).toHaveValue('USD');
  });
});

describe('a save answered with values the app does not know', () => {
  test('leaves the preferences as they were and the app rendered', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
      const url = String(input);
      if (init.method === 'PUT') return json({ settings: { ...INITIAL, currency: 'JPY' } });
      if (url === '/api/settings') return json({ settings: INITIAL });
      if (url === '/api/categories') return json({ categories: [], usage: {} });
      throw new Error(`Unexpected request: ${url}`);
    });
    const { user, queryClient } = renderSettings();

    await user.selectOptions(await screen.findByLabelText('Moeda'), 'USD');

    await waitFor(() => expect(screen.getByLabelText('Moeda')).toHaveValue('BRL'));
    expect(queryClient.getQueryData(PREFERENCES_KEY)).toEqual(DEFAULT_PREFERENCES);
  });
});
