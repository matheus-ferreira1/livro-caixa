import type { PublicUser } from '@livro-caixa/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, jsonBody } from '@/shared/api/client';

export const CURRENT_USER_KEY = ['auth', 'me'] as const;

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
        if (error instanceof ApiError && error.status === 401) return null;
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
    onSuccess: ({ user }) => queryClient.setQueryData(CURRENT_USER_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<null>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
    },
  });
}
