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
    await agent.post('/api/auth/login').send({ email: TEST_USER.email, password: TEST_USER.password, remember: false });
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
