import { describe, expect, test } from 'bun:test';
import { FakeClock } from '../../test/harness';
import { LoginThrottle, type ThrottlePolicy } from './LoginThrottle';

const WINDOW_MS = 5_000;
const POLICY: ThrottlePolicy = { maxFailures: 3, lockDurationMs: 10_000, windowMs: WINDOW_MS };
const KEY = '203.0.113.7';
const ONE_DAY_MS = 24 * 60 * 60_000;

function failTimes(throttle: LoginThrottle, count: number): boolean {
  let locked = false;
  for (let i = 0; i < count; i++) locked = throttle.registerFailure(KEY);
  return locked;
}

describe('LoginThrottle', () => {
  test('locks the key when the failures reach the limit inside the window', () => {
    const throttle = new LoginThrottle(new FakeClock(), POLICY);

    expect(failTimes(throttle, 2)).toBe(false);
    expect(throttle.secondsLocked(KEY)).toBe(0);
    expect(throttle.registerFailure(KEY)).toBe(true);
    expect(throttle.secondsLocked(KEY)).toBe(10);
  });

  test('forgets failures older than the window', () => {
    const clock = new FakeClock();
    const throttle = new LoginThrottle(clock, POLICY);

    failTimes(throttle, 2);
    clock.advance(WINDOW_MS);
    expect(throttle.registerFailure(KEY)).toBe(false);
    expect(throttle.secondsLocked(KEY)).toBe(0);
  });

  test('keeps counting indefinitely when the policy has no window', () => {
    const clock = new FakeClock();
    const throttle = new LoginThrottle(clock, { maxFailures: 2, lockDurationMs: 1_000 });

    throttle.registerFailure(KEY);
    clock.advance(ONE_DAY_MS);
    expect(throttle.registerFailure(KEY)).toBe(true);
  });

  test('unlocks the key after the lock duration', () => {
    const clock = new FakeClock();
    const throttle = new LoginThrottle(clock, POLICY);

    failTimes(throttle, POLICY.maxFailures);
    clock.advance(POLICY.lockDurationMs);
    expect(throttle.secondsLocked(KEY)).toBe(0);
  });
});
