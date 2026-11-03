import type { Dashboard, MonthKey, SummaryMode } from '@livro-caixa/domain';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TRANSACTIONS_KEY } from '@/features/transactions/api';
import { apiFetch } from '@/shared/api/client';

/** Lives under the transactions key, so any change to the ledger refreshes the dashboard. */
export function useDashboard(month: MonthKey, mode: SummaryMode) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'dashboard', month, mode],
    queryFn: () => apiFetch<Dashboard>(`/api/dashboard?month=${month}&mode=${mode}`),
    placeholderData: keepPreviousData,
  });
}
