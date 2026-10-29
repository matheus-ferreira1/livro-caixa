import request from 'supertest';
import { createContainer, type Container } from '../container';
import { createApp } from '../interface/http/app';
import { openDatabase } from '../infrastructure/db/database';
import type { Clock } from '../application/ports';

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-29T12:00:00Z').getTime()) {}
  now(): number {
    return this.current;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

export const TEST_USER = { email: 'ana@casa.dev', name: 'Ana Souza', password: 'senha-forte-123' };

export async function buildTestApp() {
  const clock = new FakeClock();
  const container: Container = createContainer({ db: openDatabase(':memory:'), clock, secureCookies: false });
  await container.createUser.execute(TEST_USER);
  const app = createApp(container);
  return { app, clock, container, agent: request.agent(app) };
}

export async function signIn(agent: ReturnType<typeof request.agent>) {
  await agent
    .post('/api/auth/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password })
    .expect(200);
}
