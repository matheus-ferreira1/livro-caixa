import type { SummaryMode, YearSummary } from '@livro-caixa/domain';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TRANSACTIONS_KEY } from '@/features/transactions/api';
import { apiFetch } from '@/shared/api/client';

/** Lives under the transactions key, so any change to the ledger refreshes the summary. */
export function useYearSummary(year: number, mode: SummaryMode) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'summary', year, mode],
    queryFn: () => apiFetch<YearSummary>(`/api/summary?year=${year}&mode=${mode}`),
    placeholderData: keepPreviousData,
  });
}
