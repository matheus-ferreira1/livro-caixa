import type { PurgeExpiredSessions } from './application/auth/PurgeExpiredSessions';

export const SESSION_PURGE_INTERVAL_MS = 60 * 60 * 1000;

/** Purges expired sessions now and then on a timer. Returns a function that stops the timer. */
export function startSessionPurge(
  purge: Pick<PurgeExpiredSessions, 'execute'>,
  intervalMs = SESSION_PURGE_INTERVAL_MS,
): () => void {
  const run = () => {
    const deleted = purge.execute();
    if (deleted > 0) console.info(`Removed ${deleted} expired session(s)`);
  };
  run();
  // unref: the cleanup timer alone must not keep the process alive on shutdown.
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
