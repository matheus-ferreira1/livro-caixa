import { Navigate, type RouteObject } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { AppShell } from '@/shared/layout/AppShell';

export const routes: RouteObject[] = [
  { path: '/entrar', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/lancamentos" replace /> },
      { path: 'lancamentos', element: <TransactionsPage /> },
      { path: '*', element: <Navigate to="/lancamentos" replace /> },
    ],
  },
];
