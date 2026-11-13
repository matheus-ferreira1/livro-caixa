import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { DEFAULT_TRUST_PROXY } from '../../config';
import { createContainer } from '../../container';
import { openDatabase } from '../../infrastructure/db/database';
import { createApp } from './app';
import { errorHandler } from './errors';

const OVERSIZED_BODY_BYTES = 200 * 1024;

function buildApp(staticDir?: string) {
  const container = createContainer({ db: openDatabase(':memory:'), secureCookies: false });
  return { container, app: createApp(container, { staticDir, trustProxy: DEFAULT_TRUST_PROXY }) };
}

describe('client errors raised by the HTTP layer', () => {
  let consoleError: ReturnType<typeof spyOn>;
  beforeEach(() => {
    consoleError = spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  test('malformed JSON answers 400 validation_error in the usual shape', async () => {
    const { app, container } = buildApp();

    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);

    expect(res.body).toEqual({
      error: { code: 'validation_error', message: container.translate()('api.invalidData') },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('a body over the size limit answers 413 without logging a server fault', async () => {
    const { app } = buildApp();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x'.repeat(OVERSIZED_BODY_BYTES) })
      .expect(413);

    expect(res.body.error.code).toBe('validation_error');
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('an unsupported charset answers 415', async () => {
    const { app } = buildApp();

    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=utf-7')
      .send('{}')
      .expect(415);

    expect(res.body.error.code).toBe('validation_error');
  });

  test('a static root without index.html answers 404 not_found', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'livro-caixa-empty-'));
    try {
      const { app, container } = buildApp(dir);

      const res = await request(app).get('/lancamentos').expect(404);

      expect(res.body).toEqual({
        error: { code: 'not_found', message: container.translate()('api.routeNotFound') },
      });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('error handler', () => {
  let consoleError: ReturnType<typeof spyOn>;
  beforeEach(() => {
    consoleError = spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  function appThrowing(error: unknown) {
    const { container } = buildApp();
    const app = express();
    app.get('/boom', () => {
      throw error;
    });
    app.use(errorHandler(container.translate));
    return { app, container };
  }

  test('an unexpected error answers 500 internal_error, logs it and leaks nothing', async () => {
    const { app, container } = appThrowing(new Error('secret detail'));

    const res = await request(app).get('/boom').expect(500);

    expect(res.body).toEqual({
      error: { code: 'internal_error', message: container.translate()('api.unexpected') },
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  test('a 5xx status is still a logged server fault', async () => {
    const { app } = appThrowing(Object.assign(new Error('upstream'), { status: 503 }));

    const res = await request(app).get('/boom').expect(500);

    expect(res.body.error.code).toBe('internal_error');
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  test('a client error status is kept and its raw message is not leaked', async () => {
    const { app } = appThrowing(Object.assign(new Error('secret detail'), { status: 405 }));

    const res = await request(app).get('/boom').expect(405);

    expect(res.body.error.code).toBe('validation_error');
    expect(JSON.stringify(res.body)).not.toContain('secret detail');
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([42, 200, 600, 400.5, '400', Number.NaN])(
    'an out-of-range or non-integer status %p is treated as a server fault',
    async (status) => {
      const { app } = appThrowing(Object.assign(new Error('odd'), { status }));

      await request(app).get('/boom').expect(500);

      expect(consoleError).toHaveBeenCalledTimes(1);
    },
  );
});
