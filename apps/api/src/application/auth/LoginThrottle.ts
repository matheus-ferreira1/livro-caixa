import type { Clock } from '../ports';

export interface ThrottlePolicy {
  maxFailures: number;
  lockDurationMs: number;
  /** Failures older than this stop counting. Without it, failures count until a reset. */
  windowMs?: number;
}

const IP_WINDOW_MS = 15 * 60_000;

/** Per e-mail + client IP: a short lock that stops guessing one account's password. */
export const ACCOUNT_THROTTLE_POLICY: ThrottlePolicy = {
  maxFailures: 5,
  lockDurationMs: 60_000,
  windowMs: IP_WINDOW_MS,
};

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

/**
 * Per e-mail, whatever the IP: caps guessing one account from many addresses, which the two
 * limits above cannot see. The threshold is high and the lock short, because anyone who knows
 * the e-mail can trigger it: it must slow an attacker without keeping the owner out for long.
 */
export const EMAIL_THROTTLE_POLICY: ThrottlePolicy = {
  maxFailures: 50,
  lockDurationMs: 5 * 60_000,
  windowMs: 60 * 60_000,
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
  private lastSweepAt = 0;

  constructor(
    private readonly clock: Clock,
    private readonly policy: ThrottlePolicy,
  ) {}

  /** How many keys are being counted or are locked. */
  get trackedKeys(): number {
    return this.attempts.size;
  }

  /** Seconds left on the lock, or 0 when the key may try again. */
  secondsLocked(key: string): number {
    const state = this.attempts.get(key);
    const remaining = state ? state.lockedUntil - this.clock.now() : 0;
    return remaining > 0 ? Math.ceil(remaining / MS_PER_SECOND) : 0;
  }

  /** Records a failure and returns true when it triggered a lock. */
  registerFailure(key: string): boolean {
    const now = this.clock.now();
    this.sweep(now);
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

  /**
   * Drops the keys that no longer matter, at most once per window. Keys are chosen by whoever
   * fails to sign in, so without this the map would grow for as long as the process lives.
   * A policy with no window never forgets a failure, so it has nothing to drop.
   */
  private sweep(now: number): void {
    const { windowMs } = this.policy;
    if (windowMs === undefined || now - this.lastSweepAt < windowMs) return;
    this.lastSweepAt = now;
    for (const [key, state] of this.attempts) {
      if (state.lockedUntil <= now && now - state.windowStart >= windowMs) this.attempts.delete(key);
    }
  }

  private currentWindow(state: AttemptState | undefined, now: number): AttemptState {
    const { windowMs } = this.policy;
    const expired = state && windowMs !== undefined && now - state.windowStart >= windowMs;
    if (!state || expired) return { failures: 0, windowStart: now, lockedUntil: state?.lockedUntil ?? 0 };
    return state;
  }
}
