import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import request from 'supertest';
import { DEFAULT_TRUST_PROXY } from '../../config';
import { createContainer } from '../../container';
import { openDatabase } from '../../infrastructure/db/database';
import { createApp } from './app';

describe('SPA serving', () => {
  const dir = mkdtempSync(join(tmpdir(), 'livro-caixa-static-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('serves index.html for client routes, even from a relative STATIC_DIR', async () => {
    writeFileSync(`${dir}/index.html`, '<!doctype html><title>Livro-caixa</title>');
    const container = createContainer({ db: openDatabase(':memory:'), secureCookies: false });
    const app = createApp(container, {
      staticDir: relative(process.cwd(), dir),
      trustProxy: DEFAULT_TRUST_PROXY,
    });

    const res = await request(app).get('/lancamentos?mes=2026-10').expect(200);
    expect(res.text).toContain('<title>Livro-caixa</title>');
    await request(app).get('/api/unknown').expect(401);
  });
});

describe('SPA serving from under a dot-directory', () => {
  const base = mkdtempSync(join(tmpdir(), 'livro-caixa-dot-'));
  const dist = join(base, '.hidden', 'dist');
  afterAll(() => rmSync(base, { recursive: true, force: true }));

  beforeAll(() => {
    mkdirSync(join(dist, 'assets'), { recursive: true });
    mkdirSync(join(dist, '.git'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Livro-caixa</title>');
    writeFileSync(join(dist, 'assets', 'app.js'), 'console.log("app");');
    writeFileSync(join(dist, '.env'), 'SECRET=hunter2');
    writeFileSync(join(dist, '.git', 'config'), '[core]\nSECRET=hunter2');
  });

  function buildApp() {
    const container = createContainer({ db: openDatabase(':memory:'), secureCookies: false });
    return createApp(container, { staticDir: dist, trustProxy: DEFAULT_TRUST_PROXY });
  }

  test('serves the app and its assets when the static directory path has a dot-directory', async () => {
    const app = buildApp();

    const home = await request(app).get('/').expect(200);
    expect(home.text).toContain('<title>Livro-caixa</title>');
    const route = await request(app).get('/lancamentos').expect(200);
    expect(route.text).toContain('<title>Livro-caixa</title>');
    const asset = await request(app).get('/assets/app.js').expect(200);
    expect(asset.text).toContain('console.log');
  });

  test('answers a dotfile inside the static directory with the app, never with the file', async () => {
    const app = buildApp();

    for (const path of ['/.env', '/.git/config']) {
      const res = await request(app).get(path).expect(200);
      expect(res.text).toContain('<title>Livro-caixa</title>');
      expect(res.text).not.toContain('hunter2');
    }
  });
});

describe('SPA fallback for requests that are not navigations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'livro-caixa-assets-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  beforeAll(() => {
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Livro-caixa</title>');
    writeFileSync(join(dir, 'assets', 'index-NEWHASH.js'), 'console.log("new");');
    writeFileSync(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  });

  function buildApp() {
    const container = createContainer({ db: openDatabase(':memory:'), secureCookies: false });
    return createApp(container, { staticDir: dir, trustProxy: DEFAULT_TRUST_PROXY });
  }

  test.each(['/assets/index-OLDHASH.js', '/assets/missing/deeper.css', '/assets/no-extension'])(
    'answers a missing file under /assets/ (%s) with a 404, not the app',
    async (path) => {
      const res = await request(buildApp()).get(path).expect(404);
      expect(res.headers['content-type']).not.toContain('text/html');
      expect(res.text).not.toContain('<title>Livro-caixa</title>');
    },
  );

  test.each(['/missing.png', '/robots.txt', '/favicon-missing.ico'])(
    'answers a missing root-level file (%s) with a 404, not the app',
    async (path) => {
      const res = await request(buildApp()).get(path).expect(404);
      expect(res.headers['content-type']).not.toContain('text/html');
    },
  );

  test('answers a missing file with the JSON not-found error', async () => {
    const res = await request(buildApp()).get('/assets/index-OLDHASH.js').expect(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  test('answers HEAD for a missing file with a 404', async () => {
    await request(buildApp()).head('/assets/index-OLDHASH.js').expect(404);
  });

  test('still serves existing files with their own content type', async () => {
    const app = buildApp();

    const script = await request(app).get('/assets/index-NEWHASH.js').expect(200);
    expect(script.headers['content-type']).toContain('javascript');
    const icon = await request(app).get('/favicon.svg').expect(200);
    expect(icon.headers['content-type']).toContain('image/svg+xml');
  });

  test.each([
    '/',
    '/lancamentos',
    '/configuracoes',
    '/qualquer-coisa',
    '/lancamentos?busca=a.b',
    '/lancamentos.',
  ])('still serves the app for the client route %s', async (path) => {
    const res = await request(buildApp()).get(path).expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<title>Livro-caixa</title>');
  });

  test('keeps answering a dotfile with the app, never with the file', async () => {
    for (const path of ['/.env', '/.git/config']) {
      const res = await request(buildApp()).get(path).expect(200);
      expect(res.text).toContain('<title>Livro-caixa</title>');
    }
  });

  test('leaves unknown API routes unchanged', async () => {
    await request(buildApp()).get('/api/unknown').expect(401);
  });
});
