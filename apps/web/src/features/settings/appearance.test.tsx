import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/shared/theme/theme';
import { mockApi, renderRoutes } from '@/test/render';
import { SettingsPage } from './SettingsPage';

type Listener = (event: { matches: boolean }) => void;

/** A stand-in for the OS color scheme that the test can flip. */
function stubSystemScheme(prefersDark: boolean) {
  const listeners = new Set<Listener>();
  const query = {
    matches: prefersDark,
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
  return {
    change(matches: boolean) {
      query.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

function setup() {
  const writes: string[] = [];
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    if (method === 'GET' && url === '/api/categories')
      return { status: 200, body: { categories: [], usage: {} } };
    if (method === 'GET' && url === '/api/settings')
      return {
        status: 200,
        body: { settings: { partnerName: 'Bia', partnerShare: 40, language: 'pt-BR', currency: 'BRL' } },
      };
    writes.push(`${method} ${url}`);
    return undefined;
  });
  const view = renderRoutes([{ path: '/configuracoes', element: <SettingsPage /> }], '/configuracoes');
  return { ...view, writes };
}

const isDark = () => document.documentElement.classList.contains('dark');

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('Aparência', () => {
  test('offers Sistema, Claro and Escuro, following the system by default', async () => {
    stubSystemScheme(false);
    setup();
    const section = (await screen.findByRole('heading', { name: 'Aparência' })).closest('section');
    if (!section) throw new Error('Aparência section not found');
    const theme = within(section).getByLabelText('Tema');
    expect(
      within(theme)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Sistema', 'Claro', 'Escuro']);
    expect(theme).toHaveValue('system');
    expect(within(section).getByText(/Vale só para este aparelho/)).toBeInTheDocument();
  });

  test('switches to dark at once, remembers it on this device and saves nothing on the server', async () => {
    stubSystemScheme(false);
    const { user, writes } = setup();
    await user.selectOptions(await screen.findByLabelText('Tema'), 'dark');
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(writes).toEqual([]);
  });

  test('keeps a light choice while the system is dark', async () => {
    stubSystemScheme(true);
    const { user } = setup();
    await screen.findByLabelText('Tema');
    expect(isDark()).toBe(true);
    await user.selectOptions(screen.getByLabelText('Tema'), 'light');
    expect(isDark()).toBe(false);
  });

  test('follows the system when it changes while Sistema is chosen', async () => {
    const system = stubSystemScheme(false);
    setup();
    await screen.findByLabelText('Tema');
    expect(isDark()).toBe(false);
    system.change(true);
    expect(isDark()).toBe(true);
  });

  test('starts from the choice saved on this device', async () => {
    stubSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    setup();
    expect(await screen.findByLabelText('Tema')).toHaveValue('dark');
    expect(isDark()).toBe(true);
  });
});
