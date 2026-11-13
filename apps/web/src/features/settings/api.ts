import {
  type Category,
  type CategoryInput,
  type CategoryPatch,
  type CategoryUsage,
  type Preferences,
  type Settings,
  type SettingsInput,
} from '@livro-caixa/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TRANSACTIONS_KEY } from '@/features/transactions/api';
import { apiFetch, jsonBody } from '@/shared/api/client';
import { isUnauthorized } from '@/shared/api/query-client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { PREFERENCES_KEY } from '@/shared/i18n/preferences';

const CATEGORIES_KEY = ['categories'] as const;
const SETTINGS_KEY = ['settings'] as const;
const SETTINGS_SAVE_SCOPE = 'settings-save';

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
  const { t } = usePreferences();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiFetch<{ category: Category }>('/api/categories', { method: 'POST', ...jsonBody(input) }),
    onSuccess: ({ category }) => {
      toast(t('settings.categoryCreated', category.name));
      return invalidate();
    },
  });
}

export function useUpdateCategory() {
  const { t } = usePreferences();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) =>
      apiFetch<{ category: Category }>(`/api/categories/${id}`, { method: 'PATCH', ...jsonBody(patch) }),
    onSuccess: () => {
      toast(t('settings.categoryUpdated'));
      return invalidate();
    },
  });
}

export function useDeleteCategory() {
  const { t } = usePreferences();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (category: Category) =>
      apiFetch<null>(`/api/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: (_, category) => {
      toast(t('settings.categoryDeleted', category.name));
      return invalidate();
    },
    onError: showError,
  });
}

/**
 * Each section of Configurações sends only its own fields, so saving one never overwrites what
 * another holds in a stale draft. A language or currency change reaches the whole app at once
 * through the preferences it updates.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    // Mutations sharing a scope run one at a time, across every call site, so the caches end on
    // the answer to the last save and an earlier answer cannot overwrite it.
    scope: { id: SETTINGS_SAVE_SCOPE },
    // The default 'online' mode would pause a save made while the browser reports offline, and
    // the shared scope would then hold back every later save with no feedback. Letting fetch fail
    // surfaces the unreachable error at once.
    networkMode: 'always',
    mutationFn: async (changes: SettingsInput) =>
      (await apiFetch<{ settings: Settings }>('/api/settings', { method: 'PUT', ...jsonBody(changes) }))
        .settings,
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      // Taken from the response, which merges onto what the server holds, so a change made on
      // another device in the meantime is not hidden behind what this client last knew.
      const previous = queryClient.getQueryData<Preferences>(PREFERENCES_KEY);
      queryClient.setQueryData<Preferences>(PREFERENCES_KEY, {
        language: settings.language,
        currency: settings.currency,
      });
      // The server writes some text itself (the dashboard's category names and partner name).
      if (settings.language !== previous?.language)
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
    onError: showError,
  });
}
