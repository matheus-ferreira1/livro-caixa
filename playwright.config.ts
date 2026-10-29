import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export const E2E_ADMIN = { email: 'e2e@livro-caixa.local', password: 'e2e-password-123', name: 'Ana Souza' };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    // Production-like: the API serves the built SPA, on a fresh in-memory database.
    command: 'bun run build && bun --cwd=apps/api src/server.ts',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      DATABASE_PATH: ':memory:',
      STATIC_DIR: '../web/dist',
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
      ADMIN_NAME: E2E_ADMIN.name,
    },
  },
});
