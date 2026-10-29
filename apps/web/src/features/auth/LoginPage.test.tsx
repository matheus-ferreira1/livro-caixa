import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { mockApi, renderRoutes } from '@/test/render';
import { LoginPage } from './LoginPage';

const USER = { id: 'u1', email: 'ana@casa.dev', name: 'Ana Souza' };

function renderLogin(state?: unknown) {
  return renderRoutes(
    [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/lancamentos', element: <h1>Lançamentos page</h1> },
    ],
    { pathname: '/entrar', state },
  );
}

describe('LoginPage', () => {
  test('shows the product pitch and the sign-in form', () => {
    mockApi(() => ({ status: 401 }));
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Suas finanças, no seu servidor.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Manter conectado neste dispositivo' })).toBeChecked();
  });

  test('validates fields before calling the server', async () => {
    const fetch = mockApi(() => ({ status: 401 }));
    const { user } = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe e-mail e senha.');

    await user.type(screen.getByLabelText('E-mail'), 'ana');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Digite um e-mail válido.');
    expect(fetch).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  test('shows the server message and clears the password on wrong credentials', async () => {
    mockApi((url) =>
      url === '/api/auth/login'
        ? { status: 401, body: { error: { code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' } } }
        : { status: 401 },
    );
    const { user } = renderLogin();
    await user.type(screen.getByLabelText('E-mail'), USER.email);
    await user.type(screen.getByLabelText('Senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  test('signs in, sending "remember", and lands on Lançamentos', async () => {
    const fetch = mockApi((url) => (url === '/api/auth/login' ? { status: 200, body: { user: USER } } : { status: 401 }));
    const { user } = renderLogin();
    await user.type(screen.getByLabelText('E-mail'), USER.email);
    await user.type(screen.getByLabelText('Senha'), 'senha-forte-123');
    await user.click(screen.getByRole('checkbox', { name: 'Manter conectado neste dispositivo' }));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Lançamentos page' })).toBeInTheDocument();
    const [, init] = fetch.mock.calls.find(([url]) => url === '/api/auth/login') ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ email: USER.email, password: 'senha-forte-123', remember: false });
  });

  test('toggles password visibility and the forgot-password help', async () => {
    mockApi(() => ({ status: 401 }));
    const { user } = renderLogin();
    const password = screen.getByLabelText('Senha');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }));
    expect(screen.getByText(/a senha é redefinida pelo administrador do servidor/)).toBeInTheDocument();
  });

  test('shows the signed-out notice passed by the app shell', async () => {
    mockApi(() => ({ status: 401 }));
    renderLogin({ notice: 'Você saiu da sua conta.' });
    expect(screen.getByRole('status')).toHaveTextContent('Você saiu da sua conta.');
  });

  test('redirects away when already signed in', async () => {
    mockApi(() => ({ status: 200, body: { user: USER } }));
    renderLogin();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lançamentos page' })).toBeInTheDocument());
  });
});
