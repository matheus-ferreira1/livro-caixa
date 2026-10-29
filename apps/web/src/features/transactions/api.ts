import type {
  Category,
  MonthKey,
  Settings,
  Totals,
  Transaction,
  TransactionInput,
} from '@livro-caixa/domain';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, jsonBody } from '@/shared/api/client';

export const TRANSACTIONS_KEY = ['transactions'] as const;

export interface SearchParams {
  type: string;
  status: string;
  category: string;
  q: string;
  from: string | null;
  to: string | null;
  sort: string;
  dir: string;
  page: number;
  pageSize: number;
}

export interface SearchResult {
  items: Transaction[];
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  totals: Totals;
  groups: { monthKey: MonthKey; count: number; netCents: number; ids: string[] }[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiFetch<{ categories: Category[] }>('/api/categories')).categories,
    staleTime: Infinity,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await apiFetch<{ settings: Settings }>('/api/settings')).settings,
    staleTime: Infinity,
  });
}

export function useMonthTransactions(month: MonthKey, enabled: boolean) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'month', month],
    queryFn: async () =>
      (await apiFetch<{ transactions: Transaction[] }>(`/api/transactions?month=${month}`)).transactions,
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSearchTransactions(params: SearchParams, enabled: boolean) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== '') query.set(key, String(value));
  }
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'search', params],
    queryFn: () => apiFetch<SearchResult>(`/api/transactions/search?${query}`),
    enabled,
    placeholderData: keepPreviousData,
  });
}

const showError = (error: Error) => toast.error(error.message);

export function useToggleFlags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; confirmed?: boolean; split?: boolean }) =>
      apiFetch<{ transaction: Transaction }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        ...jsonBody(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
    onError: showError,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Lançamento excluído');
      return queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
    onError: showError,
  });
}

export function useSaveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: TransactionInput }) =>
      apiFetch<{ transaction: Transaction }>(id ? `/api/transactions/${id}` : '/api/transactions', {
        method: id ? 'PUT' : 'POST',
        ...jsonBody(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}
