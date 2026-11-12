import type { Preferences } from '@livro-caixa/domain';
import { apiFetch } from '@/shared/api/client';

export const PREFERENCES_KEY = ['preferences'] as const;

/** A request that hangs without failing would leave the app blank, with no message and no retry. */
export const PREFERENCES_TIMEOUT_MS = 10_000;

/** Public, so the login page can speak the instance's language before anyone signs in. */
export async function fetchPreferences(): Promise<Preferences> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREFERENCES_TIMEOUT_MS);
  try {
    return await apiFetch<Preferences>('/api/preferences', { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
