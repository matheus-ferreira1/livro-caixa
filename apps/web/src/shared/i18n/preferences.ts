import { isCurrency, isLanguage, type Preferences } from '@livro-caixa/domain';
import { apiFetch } from '@/shared/api/client';

export const PREFERENCES_KEY = ['preferences'] as const;

/** A request that hangs without failing would leave the app blank, with no message and no retry. */
export const PREFERENCES_TIMEOUT_MS = 10_000;

const isPreferences = (body: unknown): body is Preferences =>
  typeof body === 'object' &&
  body !== null &&
  'language' in body &&
  typeof body.language === 'string' &&
  isLanguage(body.language) &&
  'currency' in body &&
  typeof body.currency === 'string' &&
  isCurrency(body.currency);

/**
 * Public, so the login page can speak the instance's language before anyone signs in. A body that
 * is not the preferences (an empty one, or a page a proxy answered with) is a failure, never a guess.
 * The request ends when the query is cancelled or when it takes too long.
 */
export async function fetchPreferences(querySignal?: AbortSignal): Promise<Preferences> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (querySignal?.aborted) abort();
  querySignal?.addEventListener('abort', abort, { once: true });
  // Not `AbortSignal.timeout`, which fake timers do not drive.
  const timer = setTimeout(abort, PREFERENCES_TIMEOUT_MS);
  try {
    const body = await apiFetch<unknown>('/api/preferences', { signal: controller.signal });
    if (!isPreferences(body)) throw new Error('The preferences response is not valid');
    return body;
  } finally {
    clearTimeout(timer);
    querySignal?.removeEventListener('abort', abort);
  }
}
