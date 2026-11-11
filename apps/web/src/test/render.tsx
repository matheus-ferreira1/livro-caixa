import { DEFAULT_PREFERENCES, type Preferences } from '@livro-caixa/domain';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { expireSession } from '@/features/auth/api';
import { createQueryClient } from '@/shared/api/query-client';
import { PreferencesProvider } from '@/shared/i18n/PreferencesProvider';
import { PREFERENCES_KEY } from '@/shared/i18n/preferences';
import { Toaster } from '@/shared/ui/sonner';

interface RenderOptions {
  /**
   * The language and currency the instance starts with (pt-BR and BRL by default). They are put in
   * the cache, so no request is made for them; null leaves the cache empty and the provider fetches.
   */
  preferences?: Preferences | null;
}

export function renderRoutes(
  routes: RouteObject[],
  initialEntry: string | { pathname: string; state?: unknown },
  { preferences = DEFAULT_PREFERENCES }: RenderOptions = {},
) {
  const queryClient = createQueryClient({
    onUnauthorized: expireSession,
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (preferences) queryClient.setQueryData(PREFERENCES_KEY, preferences);
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <RouterProvider router={router} />
        <Toaster />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { ...view, user, router, queryClient };
}

export const renderWithRoute = (element: ReactElement, path = '/', options?: RenderOptions) =>
  renderRoutes([{ path, element }], path, options);

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | undefined;

/** Replaces fetch with a router over (method, url); unmatched calls fail the test loudly. */
export function mockApi(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const result = handler(url, init);
    if (!result) throw new Error(`Unexpected request: ${init.method ?? 'GET'} ${url}`);
    return new Response(result.status === 204 ? null : JSON.stringify(result.body ?? {}), {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    });
  });
}
