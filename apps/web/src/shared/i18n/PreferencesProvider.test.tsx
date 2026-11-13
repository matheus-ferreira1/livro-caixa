import { translator } from '@livro-caixa/domain';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createQueryClient } from '@/shared/api/query-client';
import { PreferencesProvider, usePreferences } from '@/shared/i18n/PreferencesProvider';
import { PREFERENCES_KEY } from '@/shared/i18n/preferences';
import { mockApi, renderWithRoute } from '@/test/render';

/** The hidden comma between the languages is read out as a pause; engines differ on the space around it. */
const RETRY_NAME = /^Tentar novamente ?, Try again$/;
const LOAD_TIMEOUT_MS = 4000;
const STALL_LIMIT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 1000;
const SPINNER_DELAY_MS = 1000;

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
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: RETRY_NAME }));
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
      const retry = screen.getByRole('button', { name: RETRY_NAME });
      expect(within(retry).getByText('Tentar novamente')).toHaveAttribute('lang', 'pt-BR');
      expect(within(retry).getByText('Try again')).toHaveAttribute('lang', 'en');
    });

    test('reads the pause between the languages from the catalog, in either language', async () => {
      failing();
      renderWithRoute(<Amount />, '/', { preferences: null });
      const retry = await screen.findByRole('button', { name: RETRY_NAME }, { timeout: LOAD_TIMEOUT_MS });

      expect(retry.querySelector('.sr-only')).toHaveTextContent(translator('pt-BR')('preferences.separator'));
      expect(translator('en')('preferences.separator')).toBe(translator('pt-BR')('preferences.separator'));
    });

    test('keeps the retry button outside the alert, so its label is not announced with it', async () => {
      failing();
      renderWithRoute(<Amount />, '/', { preferences: null });
      const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS });

      expect(within(alert).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: RETRY_NAME })).toHaveAttribute('data-slot', 'button');
    });

    test('keeps the focus on the button, shows the retry running and announces the second failure', async () => {
      const failure = () =>
        new Response(JSON.stringify({ error: { code: 'internal', message: 'x' } }), { status: 500 });
      let answerRetry: (response: Response) => void = () => undefined;
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce(async () => failure())
        .mockImplementationOnce(async () => failure())
        .mockImplementationOnce(() => new Promise<Response>((resolve) => (answerRetry = resolve)));
      const { user } = renderWithRoute(<Amount />, '/', { preferences: null });
      const retry = await screen.findByRole('button', { name: RETRY_NAME }, { timeout: LOAD_TIMEOUT_MS });
      const status = screen.getByRole('status');
      expect(status).toBeEmptyDOMElement();

      await user.click(retry);
      await waitFor(() => expect(retry).toHaveAttribute('aria-busy', 'true'));
      expect(retry).toHaveAttribute('aria-disabled', 'true');
      expect(within(status).getByText('Tentando novamente…')).toHaveAttribute('lang', 'pt-BR');
      expect(within(status).getByText('Trying again…')).toHaveAttribute('lang', 'en');

      answerRetry(failure());
      const stillFailing = await within(status).findByText(
        'Ainda não foi possível carregar as preferências.',
      );
      expect(stillFailing).toHaveAttribute('lang', 'pt-BR');
      expect(within(status).getByText('Still could not load the preferences.')).toHaveAttribute('lang', 'en');
      expect(retry).toHaveAttribute('aria-busy', 'false');
      expect(retry).toHaveFocus();
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    test('makes a manual retry a single attempt, without the automatic one', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => new Response('{}', { status: 500 }));
      const { user } = renderWithRoute(<Amount />, '/', { preferences: null });
      const retry = await screen.findByRole('button', { name: RETRY_NAME }, { timeout: LOAD_TIMEOUT_MS });
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      await user.click(retry);
      await screen.findByText('Ainda não foi possível carregar as preferências.');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    test('retries automatically again on a later failing fetch once a manual retry has settled', async () => {
      const failure = () => new Response('{}', { status: 500 });
      const success = () => new Response('{"language":"en","currency":"USD"}', { status: 200 });
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce(async () => failure())
        .mockImplementationOnce(async () => failure())
        .mockImplementationOnce(async () => success())
        .mockImplementationOnce(async () => failure())
        .mockImplementationOnce(async () => success());
      const { user, queryClient } = renderWithRoute(<Amount />, '/', { preferences: null });
      await user.click(await screen.findByRole('button', { name: RETRY_NAME }, { timeout: LOAD_TIMEOUT_MS }));
      expect(await screen.findByText('$1,234.56')).toBeInTheDocument();

      await act(() => queryClient.resetQueries({ queryKey: PREFERENCES_KEY }));

      expect(await screen.findByText('$1,234.56', {}, { timeout: LOAD_TIMEOUT_MS })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(fetchSpy).toHaveBeenCalledTimes(5);
    });

    test.each([
      ['a body with no preferences', () => new Response('{}', { status: 200 })],
      ['a body that is not JSON', () => new Response('<html></html>', { status: 200 })],
      ['an unknown language', () => new Response('{"language":"fr","currency":"BRL"}', { status: 200 })],
      ['an unknown currency', () => new Response('{"language":"en","currency":"JPY"}', { status: 200 })],
    ])('shows the error and the retry for a 200 with %s', async (_name, respond) => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
      renderWithRoute(<Amount />, '/', { preferences: null });

      expect(await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS })).toHaveTextContent(
        'Could not load the preferences.',
      );
      expect(screen.getByRole('button', { name: RETRY_NAME })).toBeInTheDocument();
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

      await act(() => vi.advanceTimersByTimeAsync(2 * STALL_LIMIT_MS + DEFAULT_RETRY_DELAY_MS + 1));

      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the preferences.');
      expect(screen.getByRole('button', { name: RETRY_NAME })).toBeInTheDocument();
    });

    test('shows nothing for the first second, then a labelled spinner in both languages', async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      );
      const queryClient = createQueryClient({ onUnauthorized: () => undefined });
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <Amount />
          </PreferencesProvider>
        </QueryClientProvider>,
      );

      await act(() => vi.advanceTimersByTimeAsync(SPINNER_DELAY_MS - 1));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(1));
      const status = screen.getByRole('status');
      expect(within(status).getByText('Carregando…')).toHaveAttribute('lang', 'pt-BR');
      expect(within(status).getByText('Loading…')).toHaveAttribute('lang', 'en');
      expect(within(status).getByText('Carregando…').closest('.sr-only')).not.toBeNull();
    });

    test('reaches the error screen after a single timeout, without retrying the stalled request', async () => {
      vi.useFakeTimers();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      );
      const queryClient = createQueryClient({ onUnauthorized: () => undefined });
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <Amount />
          </PreferencesProvider>
        </QueryClientProvider>,
      );

      await act(() => vi.advanceTimersByTimeAsync(STALL_LIMIT_MS + 1));

      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the preferences.');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
