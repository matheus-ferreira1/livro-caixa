import type { Preferences } from '@livro-caixa/domain';
import { apiFetch } from '@/shared/api/client';

export const PREFERENCES_KEY = ['preferences'] as const;

/** Public, so the login page can speak the instance's language before anyone signs in. */
export const fetchPreferences = () => apiFetch<Preferences>('/api/preferences');
