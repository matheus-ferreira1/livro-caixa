import { Navigate, Outlet, type RouteObject } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';

/** Screens load on demand so the login page does not ship the signed-in app, and vice versa. */
export const routes: RouteObject[] = [
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
          { path: '*', element: <Navigate to="/lancamentos" replace /> },
        ],
      },
    ],
  },
];
