import type { Clock } from '../ports';

export interface ThrottlePolicy {
  maxFailures: number;
  lockDurationMs: number;
  /** Failures older than this stop counting. Without it, failures count until a reset. */
  windowMs?: number;
}

/** Per e-mail + client IP: a short lock that stops guessing one account's password. */
export const ACCOUNT_THROTTLE_POLICY: ThrottlePolicy = { maxFailures: 5, lockDurationMs: 60_000 };

const IP_WINDOW_MS = 15 * 60_000;

/**
 * Per client IP: a coarse cap that stops one address spraying many e-mails, which the
 * per-account lock cannot see. Only failures count, so someone who signs in correctly is
 * never slowed down; the limit sits far above what a person mistyping would reach.
 */
export const IP_THROTTLE_POLICY: ThrottlePolicy = {
  maxFailures: 20,
  lockDurationMs: IP_WINDOW_MS,
  windowMs: IP_WINDOW_MS,
};

const MS_PER_SECOND = 1000;

interface AttemptState {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

/**
 * Counts failed logins per key and locks the key after too many.
 * Kept in memory on purpose: the app runs as a single container, and a restart
 * clearing the counters is acceptable.
 */
export class LoginThrottle {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(
    private readonly clock: Clock,
    private readonly policy: ThrottlePolicy,
  ) {}

  /** Seconds left on the lock, or 0 when the key may try again. */
  secondsLocked(key: string): number {
    const state = this.attempts.get(key);
    const remaining = state ? state.lockedUntil - this.clock.now() : 0;
    return remaining > 0 ? Math.ceil(remaining / MS_PER_SECOND) : 0;
  }

  /** Records a failure and returns true when it triggered a lock. */
  registerFailure(key: string): boolean {
    const now = this.clock.now();
    const state = this.currentWindow(this.attempts.get(key), now);
    const failures = state.failures + 1;
    if (failures >= this.policy.maxFailures) {
      this.attempts.set(key, {
        failures: 0,
        windowStart: now,
        lockedUntil: now + this.policy.lockDurationMs,
      });
      return true;
    }
    this.attempts.set(key, { ...state, failures });
    return false;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private currentWindow(state: AttemptState | undefined, now: number): AttemptState {
    const { windowMs } = this.policy;
    const expired = state && windowMs !== undefined && now - state.windowStart >= windowMs;
    if (!state || expired) return { failures: 0, windowStart: now, lockedUntil: state?.lockedUntil ?? 0 };
    return state;
  }
}
