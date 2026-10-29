import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, TEST_USER } from '../../test/harness';

const THIRTEEN_HOURS_MS = 13 * 60 * 60 * 1000;

describe('PurgeExpiredSessions', () => {
  test('deletes only the sessions past their expiry', async () => {
    const { app, clock, container } = await buildTestApp();
    const browserSession = request.agent(app);
    const rememberedSession = request.agent(app);
    await browserSession
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password, remember: false })
      .expect(200);
    await rememberedSession
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password, remember: true })
      .expect(200);

    clock.advance(THIRTEEN_HOURS_MS);

    expect(container.purgeExpiredSessions.execute()).toBe(1);
    expect(container.purgeExpiredSessions.execute()).toBe(0);
    await rememberedSession.get('/api/auth/me').expect(200);
  });

  test('keeps every session before any has expired', async () => {
    const { agent, container } = await buildTestApp();
    await agent
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password, remember: false })
      .expect(200);

    expect(container.purgeExpiredSessions.execute()).toBe(0);
    await agent.get('/api/auth/me').expect(200);
  });
});
