import { afterEach, describe, expect, test, vi } from 'vitest';
import { expireSession } from '@/features/auth/api';
import { PREFERENCES_KEY } from '@/shared/i18n/preferences';
import { apiFetch } from './client';
import { createQueryClient } from './query-client';

afterEach(() => vi.restoreAllMocks());

describe('apiFetch', () => {
  test.each([
    ['en', 'Could not reach the server. Try again.'],
    ['pt-BR', 'Não foi possível falar com o servidor. Tente novamente.'],
  ] as const)('words a failed request in the instance language (%s)', async (language, message) => {
    const queryClient = createQueryClient({ onUnauthorized: expireSession });
    queryClient.setQueryData(PREFERENCES_KEY, { language, currency: 'BRL' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    await expect(apiFetch('/api/anything')).rejects.toMatchObject({ code: 'network_error', message });
  });
});
