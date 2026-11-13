import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { TrustProxy } from '../../config';
import type { Container } from '../../container';
import { authRouter } from './auth-router';
import { errorHandler } from './errors';
import { ledgerRouter } from './ledger-router';

/** Vite emits every hashed bundle under this directory, so a miss there is a stale deploy, not a route. */
const ASSETS_PATH_PREFIX = '/assets/';

/**
 * Client routes have no file extension, so anything that does (`.png`, `.js`) or lives under the
 * assets directory is a file request. Answering it with index.html would hand the browser HTML where
 * it expects a script or an image. Uses the path only, so a dot in the query string does not count.
 * A dotfile such as `/.env` has no extension to Node, so it keeps falling back to the app.
 */
function isNavigation(path: string): boolean {
  return !path.startsWith(ASSETS_PATH_PREFIX) && extname(path) === '';
}

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
  const routeNotFound: RequestHandler = (_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'not_found', message: container.translate()('api.routeNotFound') } });
  };
  app.use('/api', routeNotFound);

  if (staticDir && existsSync(staticDir)) {
    // STATIC_DIR may be relative to the working directory.
    const root = resolve(staticDir);
    app.use(express.static(root, { index: false, maxAge: '1h' }));
    app.get('/{*spa}', (req, res, next) => {
      if (!isNavigation(req.path)) {
        next();
        return;
      }
      // Given as `root`, only the path below it is checked against the dotfiles policy, so a
      // checkout under a dot-directory (such as `.claude/worktrees`) still serves the app.
      res.sendFile('index.html', { root });
    });
    app.use(routeNotFound);
  }

  app.use(errorHandler(container.translate));
  return app;
}
