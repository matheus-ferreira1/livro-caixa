import type { Asset, AssetInput, ClosingRequest, IsoDate, Snapshot, Wealth } from '@livro-caixa/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showError } from '@/features/transactions/api';
import { apiFetch, jsonBody } from '@/shared/api/client';

const WEALTH_KEY = ['wealth'] as const;

export function useWealth(today: IsoDate) {
  return useQuery({
    queryKey: [...WEALTH_KEY, today],
    queryFn: () => apiFetch<Wealth>(`/api/wealth?today=${today}`),
  });
}

export function useSaveAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: AssetInput }) =>
      apiFetch<{ asset: Asset }>(id ? `/api/assets/${id}` : '/api/assets', {
        method: id ? 'PUT' : 'POST',
        ...jsonBody(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEALTH_KEY }),
  });
}

export function useRegisterClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ClosingRequest) =>
      apiFetch<{ snapshot: Snapshot }>('/api/wealth/closings', { method: 'POST', ...jsonBody(request) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEALTH_KEY }),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      apiFetch<null>(`/api/assets/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { name }) => {
      toast(`“${name}” removido da carteira`);
      return queryClient.invalidateQueries({ queryKey: WEALTH_KEY });
    },
    onError: showError,
  });
}
