import { screen } from '@testing-library/react';
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
    mockApi(() => ({ status: 200, body: { user: USER } }));
    renderRoutes(routes, '/');
    expect(await screen.findByRole('link', { name: 'Lançamentos' })).toHaveAttribute('aria-current', 'page');
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
});
