import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { routes } from '@/routes';
import { mockApi, renderRoutes } from '@/test/render';

const USER = { id: 'u1', email: 'maria.silva@casa.dev', name: 'Maria Silva' };

describe('AppShell', () => {
  test('sends signed-out visitors to the login page', async () => {
    mockApi(() => ({ status: 401 }));
    renderRoutes(routes, '/lancamentos');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  test('shows the header with the active section and the account menu', async () => {
    mockApi((url) =>
      url === '/api/auth/me' ? { status: 200, body: { user: USER } } : { status: 200, body: {} },
    );
    renderRoutes(routes, '/');
    // "/" redirects to Lançamentos after the first render.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute('aria-current', 'page'),
    );
    expect(screen.getByRole('button', { name: 'Conta de Maria Silva' })).toHaveTextContent('MS');
  });

  test('signing out returns to the login page with a notice', async () => {
    let signedIn = true;
    mockApi((url, init) => {
      if (url === '/api/auth/logout' && init.method === 'POST') {
        signedIn = false;
        return { status: 204 };
      }
      return signedIn ? { status: 200, body: { user: USER } } : { status: 401 };
    });
    const { user } = renderRoutes(routes, '/lancamentos');
    await user.click(await screen.findByRole('button', { name: 'Conta de Maria Silva' }));
    expect(screen.getByText('maria.silva@casa.dev')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Você saiu da sua conta.');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  test('opens Configurações from the nav and from the account menu', async () => {
    mockApi((url) => {
      if (url === '/api/auth/me') return { status: 200, body: { user: USER } };
      if (url === '/api/categories') return { status: 200, body: { categories: [], usage: {} } };
      if (url === '/api/settings')
        return { status: 200, body: { settings: { partnerName: '', partnerShare: 50 } } };
      return { status: 200, body: { transactions: [] } };
    });
    const { user, router } = renderRoutes(routes, '/configuracoes');
    expect(await screen.findByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();

    await router.navigate('/lancamentos');
    await user.click(await screen.findByRole('button', { name: 'Conta de Maria Silva' }));
    await user.click(screen.getByRole('menuitem', { name: 'Configurações' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/configuracoes'));
  });
});
