import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import request from 'supertest';
import { createContainer } from '../../container';
import { openDatabase } from '../../infrastructure/db/database';
import { createApp } from './app';

describe('SPA serving', () => {
  const dir = mkdtempSync(join(tmpdir(), 'livro-caixa-static-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('serves index.html for client routes, even from a relative STATIC_DIR', async () => {
    writeFileSync(`${dir}/index.html`, '<!doctype html><title>Livro-caixa</title>');
    const container = createContainer({ db: openDatabase(':memory:'), secureCookies: false });
    const app = createApp(container, { staticDir: relative(process.cwd(), dir) });

    const res = await request(app).get('/lancamentos?mes=2026-10').expect(200);
    expect(res.text).toContain('<title>Livro-caixa</title>');
    await request(app).get('/api/unknown').expect(401);
  });
});
