import request from 'supertest';
import { DEFAULT_TRUST_PROXY, type TrustProxy } from '../config';
import { createContainer, type Container } from '../container';
import { createApp } from '../interface/http/app';
import { openDatabase } from '../infrastructure/db/database';
import type { Clock, PasswordHasher, QuoteProvider } from '../application/ports';

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-29T12:00:00Z').getTime()) {}
  now(): number {
    return this.current;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

/**
 * Compares in plain text and counts how many passwords it was asked to check. A check takes
 * `delayMs`, like a real hash, so requests sent together overlap.
 */
export class CountingHasher implements PasswordHasher {
  verifications = 0;

  constructor(private readonly delayMs = 0) {}

  hash(plain: string): Promise<string> {
    return Promise.resolve(plain);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    this.verifications += 1;
    await Bun.sleep(this.delayMs);
    return plain === hash;
  }
}

export const TEST_USER = { email: 'ana@casa.dev', name: 'Ana Souza', password: 'senha-forte-123' };

export async function buildTestApp({
  trustProxy = DEFAULT_TRUST_PROXY,
  quotes = null,
  hasher,
}: { trustProxy?: TrustProxy; quotes?: QuoteProvider | null; hasher?: PasswordHasher } = {}) {
  const clock = new FakeClock();
  const container: Container = createContainer({
    db: openDatabase(':memory:'),
    clock,
    hasher,
    secureCookies: false,
    quoteProvider: quotes,
  });
  await container.createUser.execute(TEST_USER);
  const app = createApp(container, { trustProxy });
  return { app, clock, container, agent: request.agent(app) };
}

export async function signIn(agent: ReturnType<typeof request.agent>) {
  await agent
    .post('/api/auth/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password })
    .expect(200);
}
