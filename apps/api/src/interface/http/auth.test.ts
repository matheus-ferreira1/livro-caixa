import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, signIn, TEST_USER } from '../../test/harness';

describe('POST /api/auth/login', () => {
  test('signs in with valid credentials and sets an httpOnly session cookie', async () => {
    const { app } = await buildTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ANA@casa.dev ', password: TEST_USER.password, remember: true })
      .expect(200);

    expect(res.body.user).toEqual({ id: expect.any(String), email: TEST_USER.email, name: TEST_USER.name });
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Expires=');
  });

  test('issues a browser-session cookie when "remember" is off', async () => {
    const { app } = await buildTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password, remember: false })
      .expect(200);
    expect(String(res.headers['set-cookie'])).not.toContain('Expires=');
  });

  test('answers wrong password and unknown e-mail with the same generic message', async () => {
    const { app } = await buildTestApp();
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'errada' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@casa.dev', password: 'errada' })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe('E-mail ou senha incorretos.');
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });

  test('locks the e-mail for 60 s after 5 failed attempts', async () => {
    const { app, clock } = await buildTestApp();
    const attempt = (password: string) =>
      request(app).post('/api/auth/login').send({ email: TEST_USER.email, password });

    for (let i = 0; i < 4; i++) expect((await attempt('errada')).status).toBe(401);
    const fifth = await attempt('errada');
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.message).toBe('Muitas tentativas. Tente de novo em 60 s.');

    clock.advance(20_000);
    const whileLocked = await attempt(TEST_USER.password);
    expect(whileLocked.status).toBe(429);
    expect(whileLocked.body.error.message).toBe('Muitas tentativas. Tente de novo em 40 s.');

    clock.advance(40_000);
    expect((await attempt(TEST_USER.password)).status).toBe(200);
  });

  describe('per-IP limit', () => {
    const ATTACKER_IP = '203.0.113.7';
    const OTHER_IP = '198.51.100.20';
    const IP_FAILURE_LIMIT = 20;
    const IP_LOCK_MS = 15 * 60_000;

    type App = Parameters<typeof request>[0];

    const attemptFrom = (app: App, ip: string, email: string, password: string) =>
      request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email, password });

    const sprayFailures = async (app: App, count: number) => {
      const statuses: number[] = [];
      for (let i = 0; i < count; i++) {
        statuses.push((await attemptFrom(app, ATTACKER_IP, `alvo${i}@casa.dev`, 'errada')).status);
      }
      return statuses;
    };

    test('locks an IP for 15 min after 20 failures, even across different e-mails', async () => {
      const { app } = await buildTestApp();

      const statuses = await sprayFailures(app, IP_FAILURE_LIMIT - 1);
      expect(statuses.every((status) => status === 401)).toBe(true);

      const last = await attemptFrom(app, ATTACKER_IP, 'mais-um@casa.dev', 'errada');
      expect(last.status).toBe(429);
      expect(last.body.error).toEqual({
        code: 'too_many_attempts',
        message: 'Muitas tentativas. Tente de novo em 900 s.',
      });

      const validWhileLocked = await attemptFrom(app, ATTACKER_IP, TEST_USER.email, TEST_USER.password);
      expect(validWhileLocked.status).toBe(429);
    });

    test('does not affect other IPs', async () => {
      const { app } = await buildTestApp();
      await sprayFailures(app, IP_FAILURE_LIMIT);

      expect((await attemptFrom(app, OTHER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(200);
    });

    test('lifts the lock once the 15 min have passed', async () => {
      const { app, clock } = await buildTestApp();
      await sprayFailures(app, IP_FAILURE_LIMIT);

      clock.advance(IP_LOCK_MS);
      expect((await attemptFrom(app, ATTACKER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(200);
    });

    describe('honors X-Forwarded-For only as TRUST_PROXY allows', () => {
      const sprayWithSpoofedClients = async (app: App) => {
        for (let i = 0; i < IP_FAILURE_LIMIT; i++) {
          await attemptFrom(app, `192.0.2.${i}, ${ATTACKER_IP}`, `alvo${i}@casa.dev`, 'errada');
        }
      };

      test('by default, a spoofed entry left of the loopback proxy does not dodge the lock', async () => {
        const { app } = await buildTestApp();
        await sprayWithSpoofedClients(app);

        expect((await attemptFrom(app, ATTACKER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(429);
      });

      test('with false, the header is ignored and every client shares the peer address', async () => {
        const { app } = await buildTestApp({ trustProxy: false });
        await sprayFailures(app, IP_FAILURE_LIMIT);

        expect((await attemptFrom(app, OTHER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(429);
      });

      test('with 1, the address appended by the one trusted proxy is the client', async () => {
        const { app } = await buildTestApp({ trustProxy: 1 });
        await sprayWithSpoofedClients(app);

        expect((await attemptFrom(app, ATTACKER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(429);
        expect((await attemptFrom(app, OTHER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(200);
      });

      test('with 2, the entry left of the second trusted proxy is the client', async () => {
        const { app } = await buildTestApp({ trustProxy: 2 });
        await sprayWithSpoofedClients(app);

        expect((await attemptFrom(app, ATTACKER_IP, TEST_USER.email, TEST_USER.password)).status).toBe(200);
      });
    });
  });

  test('rejects malformed requests', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'x', password: '' }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('session lifecycle', () => {
  test('GET /api/auth/me returns the signed-in user', async () => {
    const { agent } = await buildTestApp();
    await agent.get('/api/auth/me').expect(401);
    await signIn(agent);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe(TEST_USER.email);
  });

  test('sessions expire', async () => {
    const { agent, clock } = await buildTestApp();
    await agent
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password, remember: false });
    clock.advance(13 * 60 * 60 * 1000);
    await agent.get('/api/auth/me').expect(401);
  });

  test('logout revokes the session', async () => {
    const { agent } = await buildTestApp();
    await signIn(agent);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});
