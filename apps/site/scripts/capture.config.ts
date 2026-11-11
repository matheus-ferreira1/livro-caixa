import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { E2E_ADMIN } from '../../../playwright.config';

/** Not the e2e port, so a capture can run while the e2e server is up. */
const PORT = 4175;
const REPO_ROOT = resolve(import.meta.dirname, '../../..');
// A fixed path, because Playwright evaluates this file in every worker and they must agree on it.
const DATABASE_PATH = join(tmpdir(), 'livro-caixa-site-capture.sqlite');

/** Every variable the API reads, set explicitly so a developer's .env never leaks in. */
const SERVER_ENV = {
  PORT: String(PORT),
  DATABASE_PATH,
  STATIC_DIR: '../web/dist',
  BRAPI_TOKEN: '',
  SECURE_COOKIES: 'false',
  TRUST_PROXY: 'loopback',
  ADMIN_EMAIL: E2E_ADMIN.email,
  ADMIN_PASSWORD: E2E_ADMIN.password,
  ADMIN_NAME: E2E_ADMIN.name,
};

/**
 * Captures the project site's screenshots from the real app, with the demo seed on a throwaway
 * database. Run with `bun run capture:site`.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'capture-screenshots.ts',
  workers: 1,
  reporter: 'list',
  timeout: 120_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    // Playwright starts the web server before globalSetup, and every worker re-evaluates this file,
    // so the old database is removed by the first step of the command, in Bun rather than `rm`.
    command: [
      'bun apps/site/scripts/remove-capture-database.ts',
      'bun run build',
      'bun apps/api/src/seed-demo.ts',
      'bun --cwd=apps/api src/server.ts',
    ].join(' && '),
    cwd: REPO_ROOT,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: SERVER_ENV,
  },
});
