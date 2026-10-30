import { Navigate, Outlet, type RouteObject } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';

/** The first screen's chunk loads in a blink; a blank page avoids a flash, as RequireAuth does. */
function BlankWhileLoading() {
  return null;
}

/** Screens load on demand so the login page does not ship the signed-in app, and vice versa. */
export const routes: RouteObject[] = [
  {
    HydrateFallback: BlankWhileLoading,
    children: [
      {
        path: '/entrar',
        lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }),
      },
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          {
            lazy: async () => ({ Component: (await import('@/shared/layout/AppShell')).AppShell }),
            children: [
              { index: true, element: <Navigate to="/lancamentos" replace /> },
              {
                path: 'lancamentos',
                lazy: async () => ({
                  Component: (await import('@/features/transactions/TransactionsPage')).TransactionsPage,
                }),
              },
              {
                path: 'configuracoes',
                lazy: async () => ({
                  Component: (await import('@/features/settings/SettingsPage')).SettingsPage,
                }),
              },
              { path: '*', element: <Navigate to="/lancamentos" replace /> },
            ],
          },
        ],
      },
    ],
  },
];
