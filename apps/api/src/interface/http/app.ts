import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Container } from '../../container';
import { authRouter } from './auth-router';
import { errorHandler } from './errors';
import { ledgerRouter } from './ledger-router';

export interface AppOptions {
  /** Built SPA to serve next to the API (production image only). */
  staticDir?: string;
}

export function createApp(container: Container, { staticDir }: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(container));
  app.use('/api', ledgerRouter(container));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*spa}', (_req, res) => {
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
