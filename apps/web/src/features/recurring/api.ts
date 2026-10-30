import type {
  MonthKey,
  RecurringCandidate,
  RecurringGenerateRequest,
  Transaction,
} from '@livro-caixa/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TRANSACTIONS_KEY } from '@/features/transactions/api';
import { apiFetch, jsonBody } from '@/shared/api/client';

/** Lives under the transactions key, so any change to the ledger refreshes the suggestions. */
export function useRecurringCandidates(month: MonthKey, enabled: boolean) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'recurring', month],
    queryFn: async () =>
      (await apiFetch<{ candidates: RecurringCandidate[] }>(`/api/recurring/candidates?month=${month}`))
        .candidates,
    enabled,
  });
}

export function useGenerateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RecurringGenerateRequest) =>
      apiFetch<{ transactions: Transaction[] }>('/api/recurring/generate', {
        method: 'POST',
        ...jsonBody(request),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}
