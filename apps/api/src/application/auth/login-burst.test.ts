import { describe, expect, test } from 'bun:test';
import { translator } from '@livro-caixa/domain';
import { openDatabase } from '../../infrastructure/db/database';
import { SqliteSessionRepository } from '../../infrastructure/repositories/SqliteSessionRepository';
import { SqliteUserRepository } from '../../infrastructure/repositories/SqliteUserRepository';
import { CountingHasher, FakeClock } from '../../test/harness';
import { Login } from './Login';
import { ACCOUNT_THROTTLE_POLICY, IP_THROTTLE_POLICY, LoginThrottle } from './LoginThrottle';

const CLIENT_IP = '203.0.113.7';
const OTHER_IP = '198.51.100.20';
const EMAIL = 'ana@casa.dev';
const PASSWORD = 'senha-forte-123';
const BURST_SIZE = 30;

function buildLogin() {
  const db = openDatabase(':memory:');
  const users = new SqliteUserRepository(db);
  users.create({ id: 'u1', email: EMAIL, name: 'Ana Souza', passwordHash: PASSWORD });
  const clock = new FakeClock();
  const hasher = new CountingHasher();
  const login = new Login(
    users,
    new SqliteSessionRepository(db),
    hasher,
    new LoginThrottle(clock, ACCOUNT_THROTTLE_POLICY),
    new LoginThrottle(clock, IP_THROTTLE_POLICY),
    clock,
    () => translator('pt-BR'),
  );
  const attempt = (password: string, ip = CLIENT_IP) =>
    login.execute({ email: EMAIL, password, remember: true }, ip);
  return { attempt, hasher };
}

describe('Login under a burst of simultaneous attempts', () => {
  test('checks no more passwords than the account limit allows', async () => {
    const { attempt, hasher } = buildLogin();

    await Promise.allSettled(Array.from({ length: BURST_SIZE }, (_, i) => attempt(`errada-${i}`)));

    expect(hasher.verifications).toBe(ACCOUNT_THROTTLE_POLICY.maxFailures);
  });

  test('refuses the right password once the guesses before it locked the account', async () => {
    const { attempt } = buildLogin();
    const guesses = Array.from({ length: ACCOUNT_THROTTLE_POLICY.maxFailures }, (_, i) =>
      attempt(`errada-${i}`),
    );

    const results = await Promise.allSettled([...guesses, attempt(PASSWORD)]);

    expect(results.at(-1)?.status).toBe('rejected');
  });

  test('does not make another client wait', async () => {
    const { attempt } = buildLogin();
    const finished: string[] = [];
    const burst = Array.from({ length: BURST_SIZE }, (_, i) =>
      attempt(`errada-${i}`).catch(() => finished.push('burst')),
    );
    const other = attempt(PASSWORD, OTHER_IP).then(() => finished.push('other'));

    await Promise.all([...burst, other]);

    // Sent last, it would also end last if it had to wait its turn behind the burst.
    expect(finished.at(-1)).toBe('burst');
    expect(finished).toContain('other');
  });

  test('still signs in after an attempt of the same client failed', async () => {
    const { attempt } = buildLogin();

    const [wrong, right] = await Promise.allSettled([attempt('errada'), attempt(PASSWORD)]);

    expect(wrong.status).toBe('rejected');
    expect(right.status).toBe('fulfilled');
  });
});
