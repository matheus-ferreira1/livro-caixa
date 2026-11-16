import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { DEFAULT_TRUST_PROXY } from '../../config';
import { buildTestApp, signIn, TEST_USER } from '../../test/harness';
import { createApp } from './app';

describe('security headers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'livro-caixa-security-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('every response forbids framing, sniffing and foreign content', async () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Livro-caixa</title>');
    const { container } = await buildTestApp();
    const app = createApp(container, { staticDir: dir, trustProxy: DEFAULT_TRUST_PROXY });

    for (const path of ['/entrar', '/api/health', '/api/auth/me']) {
      const { headers } = await request(app).get(path);
      expect(headers['content-security-policy']).toContain("default-src 'self'");
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('no-referrer');
    }
  });

  test('asks for HTTPS on later visits only when the instance is served over HTTPS', async () => {
    const overHttps = await buildTestApp({ secureCookies: true });
    const overHttp = await buildTestApp();

    const secure = await request(overHttps.app).get('/api/health');
    const plain = await request(overHttp.app).get('/api/health');

    expect(secure.headers['strict-transport-security']).toBe('max-age=31536000');
    expect(plain.headers['strict-transport-security']).toBeUndefined();
  });

  test('API responses are never stored by the browser or a proxy', async () => {
    const { agent } = await buildTestApp();
    await signIn(agent);

    const res = await agent.get('/api/settings').expect(200);

    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('requests from another site', () => {
  const login = (app: Parameters<typeof request>[0], site: string) =>
    request(app)
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', site)
      .send({ email: TEST_USER.email, password: TEST_USER.password });

  test('a write sent by another site or a sibling subdomain is refused', async () => {
    const { app } = await buildTestApp();

    for (const site of ['cross-site', 'same-site']) {
      const res = await login(app, site);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('forbidden');
    }
  });

  test('a write from the app itself, or typed by the user, goes through', async () => {
    const { app } = await buildTestApp();

    expect((await login(app, 'same-origin')).status).toBe(200);
    expect((await login(app, 'none')).status).toBe(200);
  });

  test('reads are not affected, so a link from another site still opens', async () => {
    const { app } = await buildTestApp();

    await request(app).get('/api/health').set('Sec-Fetch-Site', 'cross-site').expect(200);
  });
});

describe('session cookie over HTTPS', () => {
  test('is bound to this exact host, so a sibling subdomain cannot plant one', async () => {
    const { app } = await buildTestApp({ secureCookies: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);
    const [cookie = ''] = ([] as string[]).concat(res.headers['set-cookie'] ?? []);

    expect(cookie).toStartWith('__Host-lc_session=');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');

    const session = cookie.split(';')[0] ?? '';
    await request(app).get('/api/auth/me').set('Cookie', session).expect(200);
    await request(app).get('/api/auth/me').set('Cookie', session.replace('__Host-', '')).expect(401);
  });
});

describe('a session opened before the cookie was bound to the host', () => {
  const LEGACY_COOKIE = 'lc_session';

  async function legacySession() {
    const built = await buildTestApp({ secureCookies: true });
    const res = await request(built.app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);
    const [cookie = ''] = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const token = (cookie.split(';')[0] ?? '').split('=')[1] ?? '';
    return { ...built, token };
  }

  test('is revoked and its cookie cleared at the next sign-in', async () => {
    const { app, token } = await legacySession();

    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `${LEGACY_COOKIE}=${token}`)
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(String(res.headers['set-cookie'])).toContain(`${LEGACY_COOKIE}=;`);
    await request(app).get('/api/auth/me').set('Cookie', `__Host-${LEGACY_COOKIE}=${token}`).expect(401);
  });

  test('is revoked at sign-out too', async () => {
    const { app, token } = await legacySession();

    await request(app).post('/api/auth/logout').set('Cookie', `${LEGACY_COOKIE}=${token}`).expect(204);

    await request(app).get('/api/auth/me').set('Cookie', `__Host-${LEGACY_COOKIE}=${token}`).expect(401);
  });
});

describe('an instance behind HTTPS with SECURE_COOKIES left off', () => {
  test('warns once, because the session cookie would also travel over plain HTTP', async () => {
    const consoleWarn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { app } = await buildTestApp();
      await request(app).get('/api/health').expect(200);
      expect(consoleWarn).not.toHaveBeenCalled();

      await request(app).get('/api/health').set('X-Forwarded-Proto', 'https').expect(200);
      await request(app).get('/api/health').set('X-Forwarded-Proto', 'https').expect(200);

      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(String(consoleWarn.mock.calls[0]?.[0])).toContain('SECURE_COOKIES=true');
    } finally {
      consoleWarn.mockRestore();
    }
  });

  test('stays quiet when cookies are already secure', async () => {
    const consoleWarn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { app } = await buildTestApp({ secureCookies: true });
      await request(app).get('/api/health').set('X-Forwarded-Proto', 'https').expect(200);

      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleWarn.mockRestore();
    }
  });
});
