import { afterAll, describe, expect, test } from 'bun:test';
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

  function buildApp() {
    mkdirSync(join(dist, 'assets'), { recursive: true });
    mkdirSync(join(dist, '.git'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Livro-caixa</title>');
    writeFileSync(join(dist, 'assets', 'app.js'), 'console.log("app");');
    writeFileSync(join(dist, '.env'), 'SECRET=hunter2');
    writeFileSync(join(dist, '.git', 'config'), '[core]\nSECRET=hunter2');
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
