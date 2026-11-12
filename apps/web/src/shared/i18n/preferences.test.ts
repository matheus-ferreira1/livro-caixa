import { afterEach, describe, expect, test, vi } from 'vitest';
import { fetchPreferences } from './preferences';

afterEach(() => vi.restoreAllMocks());

describe('fetchPreferences', () => {
  test('aborts its request when the query that asked for it is cancelled', async () => {
    let requestSignal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          requestSignal = init?.signal;
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const query = new AbortController();

    const pending = fetchPreferences(query.signal);
    query.abort();

    await expect(pending).rejects.toThrow();
    expect(requestSignal?.aborted).toBe(true);
  });
});
