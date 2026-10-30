import type { Category, CategoryInput, CategoryPatch, CategoryUsage, Settings } from '@livro-caixa/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, jsonBody } from '@/shared/api/client';
import { isUnauthorized } from '@/shared/api/query-client';

const CATEGORIES_KEY = ['categories'] as const;
const SETTINGS_KEY = ['settings'] as const;

interface CategoryCatalog {
  categories: Category[];
  usage: CategoryUsage;
}

const fetchCatalog = () => apiFetch<CategoryCatalog>('/api/categories');

/** The categories alone, for screens that only label and pick them. */
export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => (await fetchCatalog()).categories,
    staleTime: Infinity,
  });
}

/** Categories plus usage counts; refetched on mount because entries change the counts. */
export function useCategoryCatalog() {
  return useQuery({ queryKey: [...CATEGORIES_KEY, 'catalog'], queryFn: fetchCatalog });
}

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => (await apiFetch<{ settings: Settings }>('/api/settings')).settings,
    staleTime: Infinity,
  });
}

// An expired session redirects to sign-in instead of showing an error.
const showError = (error: Error) => {
  if (!isUnauthorized(error)) toast.error(error.message);
};

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
}

/** Errors are shown inline by the form, so no toast here. */
export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiFetch<{ category: Category }>('/api/categories', { method: 'POST', ...jsonBody(input) }),
    onSuccess: ({ category }) => {
      toast(`Categoria “${category.name}” criada`);
      return invalidate();
    },
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) =>
      apiFetch<{ category: Category }>(`/api/categories/${id}`, { method: 'PATCH', ...jsonBody(patch) }),
    onSuccess: () => {
      toast('Categoria atualizada');
      return invalidate();
    },
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (category: Category) =>
      apiFetch<null>(`/api/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: (_, category) => {
      toast(`Categoria “${category.name}” excluída`);
      return invalidate();
    },
    onError: showError,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Settings) =>
      (await apiFetch<{ settings: Settings }>('/api/settings', { method: 'PUT', ...jsonBody(settings) }))
        .settings,
    onSuccess: (settings) => queryClient.setQueryData(SETTINGS_KEY, settings),
    onError: showError,
  });
}
