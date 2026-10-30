import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { mockApi, renderRoutes } from '@/test/render';
import { LoginPage } from './LoginPage';
import { RequireAuth } from './RequireAuth';

const USER = { id: 'u1', email: 'ana@casa.dev', name: 'Ana Souza' };
const CATEGORIES = [{ id: 'c-mercado', name: 'Mercado', type: 'despesa', color: '#1BAF7A' }];
const SETTINGS = { partnerName: 'Bia', partnerShare: 50 };
const MARKET = {
  id: 'feira',
  date: '2026-10-10',
  description: 'Feira',
  note: '',
  type: 'despesa',
  categoryId: 'c-mercado',
  valueCents: 1_000,
  split: false,
  confirmed: true,
  recurring: false,
  seriesId: null,
};
const EXPIRED = { status: 401, body: { error: { code: 'unauthenticated', message: 'Sessão expirada.' } } };
const WRONG_CREDENTIALS = {
  status: 401,
  body: { error: { code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' } },
};
const MONTH_PATH = '/lancamentos?mes=2026-10';

type Override = (url: string, method: string) => { status: number; body?: unknown } | undefined;

function renderApp(override: Override) {
  let signedIn = true;
  mockApi((url, init) => {
    const method = init.method ?? 'GET';
    if (url === '/api/auth/me') return signedIn ? { status: 200, body: { user: USER } } : { status: 401 };
    const overridden = override(url, method);
    if (overridden) {
      if (overridden.status === 401) signedIn = false;
      return overridden;
    }
    if (url === '/api/auth/login') {
      signedIn = true;
      return { status: 200, body: { user: USER } };
    }
    if (url === '/api/categories') return { status: 200, body: { categories: CATEGORIES } };
    if (url === '/api/settings') return { status: 200, body: { settings: SETTINGS } };
    if (url.startsWith('/api/transactions?month=')) return { status: 200, body: { transactions: [MARKET] } };
    return undefined;
  });
  return renderRoutes(
    [
      { path: '/entrar', element: <LoginPage /> },
      {
        path: '/lancamentos',
        element: (
          <RequireAuth>
            <TransactionsPage />
          </RequireAuth>
        ),
      },
    ],
    MONTH_PATH,
  );
}

describe('session expiry', () => {
  test('a 401 on a data query sends the user to the login screen without an error toast', async () => {
    renderApp((url) => (url.startsWith('/api/transactions?month=') ? EXPIRED : undefined));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByText('Sessão expirada.')).not.toBeInTheDocument();
  });

  test('a 401 on a mutation sends the user to the login screen without an error toast', async () => {
    const { user } = renderApp((url, method) => (method === 'DELETE' ? EXPIRED : undefined));
    await user.click(await screen.findByRole('button', { name: 'Excluir Feira' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByText('Sessão expirada.')).not.toBeInTheDocument();
  });

  test('signing in again returns to the page the user was on', async () => {
    let expired = false;
    const { user, router } = renderApp((url) => {
      if (expired || !url.startsWith('/api/transactions?month=')) return undefined;
      expired = true;
      return EXPIRED;
    });
    await screen.findByRole('heading', { name: 'Entrar' });

    await user.type(screen.getByLabelText('E-mail'), USER.email);
    await user.type(screen.getByLabelText('Senha'), 'senha-forte-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('button', { name: 'Excluir Feira' })).toBeInTheDocument();
    expect(router.state.location.pathname + router.state.location.search).toBe(MONTH_PATH);
  });

  test('wrong credentials on the login screen still show the inline error', async () => {
    const { user } = renderApp((url) => {
      if (url === '/api/auth/login') return WRONG_CREDENTIALS;
      return url.startsWith('/api/transactions?month=') ? EXPIRED : undefined;
    });
    await screen.findByRole('heading', { name: 'Entrar' });
    await user.type(screen.getByLabelText('E-mail'), USER.email);
    await user.type(screen.getByLabelText('Senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
