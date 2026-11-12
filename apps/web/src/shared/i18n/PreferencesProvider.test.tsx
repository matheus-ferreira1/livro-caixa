import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createQueryClient } from '@/shared/api/query-client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { PreferencesProvider } from '@/shared/i18n/PreferencesProvider';
import { mockApi, renderWithRoute } from '@/test/render';

const LOAD_TIMEOUT_MS = 4000;
const STALL_LIMIT_MS = 10_000;

function Amount() {
  const { money } = usePreferences();
  return <p>{money.format(123_456)}</p>;
}

describe('PreferencesProvider', () => {
  test('renders nothing of the app until the preferences have loaded', async () => {
    mockApi((url) =>
      url === '/api/preferences' ? { status: 200, body: { language: 'en', currency: 'USD' } } : undefined,
    );
    renderWithRoute(<Amount />, '/', { preferences: null });
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();
  });

  test('shows a bilingual error with a retry instead of the app when they cannot be loaded', async () => {
    let attempts = 0;
    mockApi((url) => {
      if (url !== '/api/preferences') return undefined;
      attempts += 1;
      return attempts <= 2
        ? { status: 500, body: { error: { code: 'internal', message: 'x' } } }
        : { status: 200, body: { language: 'en', currency: 'USD' } };
    });
    const { user } = renderWithRoute(<Amount />, '/', { preferences: null });

    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS });
    expect(alert).toHaveTextContent('Não foi possível carregar as preferências.');
    expect(alert).toHaveTextContent('Could not load the preferences.');
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente Try again' }));
    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('when they cannot be loaded', () => {
    const failing = () =>
      mockApi((url) =>
        url === '/api/preferences'
          ? { status: 500, body: { error: { code: 'internal', message: 'x' } } }
          : undefined,
      );

    test('marks each half of the message and of the retry label with its own language', async () => {
      failing();
      renderWithRoute(<Amount />, '/', { preferences: null });
      const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS });

      expect(within(alert).getByText('Não foi possível carregar as preferências.')).toHaveAttribute(
        'lang',
        'pt-BR',
      );
      expect(within(alert).getByText('Could not load the preferences.')).toHaveAttribute('lang', 'en');
      const retry = screen.getByRole('button', { name: 'Tentar novamente Try again' });
      expect(within(retry).getByText('Tentar novamente')).toHaveAttribute('lang', 'pt-BR');
      expect(within(retry).getByText('Try again')).toHaveAttribute('lang', 'en');
    });

    test('keeps the retry button outside the alert, so its label is not announced with it', async () => {
      failing();
      renderWithRoute(<Amount />, '/', { preferences: null });
      const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS });

      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente Try again' })).toHaveAttribute(
        'data-slot',
        'button',
      );
    });

    test('keeps the focus on the retry button when the retry fails too', async () => {
      failing();
      const { user } = renderWithRoute(<Amount />, '/', { preferences: null });
      const retry = await screen.findByRole(
        'button',
        { name: 'Tentar novamente Try again' },
        { timeout: LOAD_TIMEOUT_MS },
      );

      await user.click(retry);
      expect(retry).toHaveAttribute('aria-disabled', 'true');
      await waitFor(() => expect(retry).toHaveAttribute('aria-disabled', 'false'), {
        timeout: LOAD_TIMEOUT_MS,
      });
      expect(retry).toHaveFocus();
    });
  });

  describe('when the request stalls', () => {
    afterEach(() => vi.useRealTimers());

    test('ends in the error state with a retry instead of staying blank', async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      );
      const queryClient = createQueryClient({
        onUnauthorized: () => undefined,
        defaultOptions: { queries: { retry: false } },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <Amount />
          </PreferencesProvider>
        </QueryClientProvider>,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(STALL_LIMIT_MS + 1));

      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the preferences.');
      expect(screen.getByRole('button', { name: 'Tentar novamente Try again' })).toBeInTheDocument();
    });
  });
});
