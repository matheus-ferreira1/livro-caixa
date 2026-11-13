import { afterEach, describe, expect, test, vi } from 'vitest';
import { fetchPreferences, PREFERENCES_TIMEOUT_MS, PreferencesTimeoutError } from './preferences';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  test('fails with a timeout error, not a plain abort, when the request stalls', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const pending = expect(fetchPreferences()).rejects.toBeInstanceOf(PreferencesTimeoutError);
    await vi.advanceTimersByTimeAsync(PREFERENCES_TIMEOUT_MS);

    await pending;
  });

  test('does not call a cancellation a timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const query = new AbortController();

    const pending = fetchPreferences(query.signal);
    query.abort();

    await expect(pending).rejects.not.toBeInstanceOf(PreferencesTimeoutError);
  });
});
