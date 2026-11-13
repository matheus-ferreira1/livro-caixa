import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TrustProxy } from '../../config';
import type { Container } from '../../container';
import { authRouter } from './auth-router';
import { errorHandler } from './errors';
import { ledgerRouter } from './ledger-router';

export interface AppOptions {
  /** Built SPA to serve next to the API (production image only). */
  staticDir?: string;
  /** Which proxies may set `X-Forwarded-For`; decides `req.ip` and so the per-IP login limit. */
  trustProxy: TrustProxy;
}

export function createApp(container: Container, { staticDir, trustProxy }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/api/preferences', (_req, res) => {
    const { language, currency } = container.settings.get();
    res.json({ language, currency });
  });
  app.use('/api/auth', authRouter(container));
  app.use('/api', ledgerRouter(container));
  app.use('/api', (_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'not_found', message: container.translate()('api.routeNotFound') } });
  });

  if (staticDir && existsSync(staticDir)) {
    // STATIC_DIR may be relative to the working directory.
    const root = resolve(staticDir);
    app.use(express.static(root, { index: false, maxAge: '1h' }));
    app.get('/{*spa}', (_req, res) => {
      // Given as `root`, only the path below it is checked against the dotfiles policy, so a
      // checkout under a dot-directory (such as `.claude/worktrees`) still serves the app.
      res.sendFile('index.html', { root });
    });
  }

  app.use(errorHandler(container.translate));
  return app;
}
