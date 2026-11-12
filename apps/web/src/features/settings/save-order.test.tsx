import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { renderRoutes } from '@/test/render';
import { SettingsPage } from './SettingsPage';

interface Save {
  answered: boolean;
  respond: () => void;
}

const INITIAL = { partnerName: 'Bia', partnerShare: 40, language: 'pt-BR', currency: 'BRL' };

/**
 * A server that merges each save when it receives it, but whose answers wait for the test, so the
 * test decides the order they arrive in.
 */
function setupDeferredServer() {
  let stored: Record<string, unknown> = INITIAL;
  const saves: Save[] = [];
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = String(input);
    if (init.method === 'PUT') {
      stored = { ...stored, ...(JSON.parse(String(init.body)) as object) };
      const answer = stored;
      return new Promise<Response>((resolve) => {
        const save: Save = {
          answered: false,
          respond: () => {
            save.answered = true;
            resolve(json({ settings: answer }));
          },
        };
        saves.push(save);
      });
    }
    if (url === '/api/settings') return json({ settings: stored });
    if (url === '/api/categories') return json({ categories: [], usage: {} });
    throw new Error(`Unexpected request: ${url}`);
  });
  return saves;
}

describe('saving settings', () => {
  test('ends on the server latest state even when its answers are given newest first', async () => {
    const saves = setupDeferredServer();
    const { user, queryClient } = renderRoutes(
      [{ path: '/configuracoes', element: <SettingsPage /> }],
      '/configuracoes',
    );
    await user.selectOptions(await screen.findByLabelText('Idioma'), 'en');
    await user.selectOptions(screen.getByLabelText('Moeda'), 'USD');

    for (let answers = 0; answers < 2; answers += 1) {
      await waitFor(() => expect(saves.some((save) => !save.answered)).toBe(true));
      saves.findLast((save) => !save.answered)?.respond();
    }

    await waitFor(() => expect(queryClient.getQueryData(['settings'])).toMatchObject({ currency: 'USD' }));
    expect(queryClient.getQueryData(['preferences'])).toEqual({ language: 'en', currency: 'USD' });
    expect(queryClient.getQueryData(['settings'])).toMatchObject({ language: 'en' });
  });
});
