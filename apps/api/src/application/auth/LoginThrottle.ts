import type { Clock } from '../ports';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 60_000;

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

/**
 * Counts failed logins per key (e-mail + client IP) and locks the key after too many.
 * Kept in memory on purpose: the app runs as a single container, and a restart
 * clearing the counters is acceptable.
 */
export class LoginThrottle {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(private readonly clock: Clock) {}

  /** Seconds left on the lock, or 0 when the key may try again. */
  secondsLocked(key: string): number {
    const state = this.attempts.get(key);
    const remaining = state ? state.lockedUntil - this.clock.now() : 0;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /** Records a failure and returns true when it triggered a lock. */
  registerFailure(key: string): boolean {
    const state = this.attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
    const failures = state.failures + 1;
    if (failures >= MAX_LOGIN_ATTEMPTS) {
      this.attempts.set(key, { failures: 0, lockedUntil: this.clock.now() + LOCK_DURATION_MS });
      return true;
    }
    this.attempts.set(key, { failures, lockedUntil: state.lockedUntil });
    return false;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
