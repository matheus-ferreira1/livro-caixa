import type { PublicUser } from '@livro-caixa/domain';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, jsonBody } from '@/shared/api/client';
import { IGNORE_UNAUTHORIZED, isUnauthorized } from '@/shared/api/query-client';

export const CURRENT_USER_KEY = ['auth', 'me'] as const;

/** Forgetting the user makes RequireAuth send them to the sign-in screen, remembering where they were. */
export const expireSession = (queryClient: QueryClient) => queryClient.setQueryData(CURRENT_USER_KEY, null);

export interface LoginVariables {
  email: string;
  password: string;
  remember: boolean;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: async (): Promise<PublicUser | null> => {
      try {
        const { user } = await apiFetch<{ user: PublicUser }>('/api/auth/me');
        return user;
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: LoginVariables) =>
      apiFetch<{ user: PublicUser }>('/api/auth/login', { method: 'POST', ...jsonBody(variables) }),
    meta: IGNORE_UNAUTHORIZED,
    onSuccess: ({ user }) => queryClient.setQueryData(CURRENT_USER_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>('/api/auth/logout', { method: 'POST' }),
    // Signing out handles a gone session itself and shows its own notice.
    meta: IGNORE_UNAUTHORIZED,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
    },
  });
}
