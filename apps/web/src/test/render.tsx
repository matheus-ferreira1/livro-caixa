import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { Toaster } from '@/shared/ui/sonner';

export function renderRoutes(routes: RouteObject[], initialEntry: string | { pathname: string; state?: unknown }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const user = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...view, user, router, queryClient };
}

export const renderWithRoute = (element: ReactElement, path = '/') => renderRoutes([{ path, element }], path);

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
