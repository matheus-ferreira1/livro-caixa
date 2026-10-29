import { describe, expect, test } from 'bun:test';
import { startSessionPurge } from './session-purge';

const TICK_MS = 5;

describe('startSessionPurge', () => {
  test('purges once on start, then on every interval until stopped', async () => {
    let runs = 0;
    const purge = {
      execute: () => {
        runs += 1;
        return 0;
      },
    };
    const stop = startSessionPurge(purge, TICK_MS);
    expect(runs).toBe(1);

    await Bun.sleep(TICK_MS * 4);
    stop();
    const runsWhenStopped = runs;
    expect(runsWhenStopped).toBeGreaterThan(1);

    await Bun.sleep(TICK_MS * 4);
    expect(runs).toBe(runsWhenStopped);
  });
});
