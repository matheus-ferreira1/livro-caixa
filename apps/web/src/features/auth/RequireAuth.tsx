import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useCurrentUser } from './api';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();
  if (isPending) return null;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
