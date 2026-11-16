import { loginRequestSchema } from '@livro-caixa/domain';
import { Router, type Request, type Response } from 'express';
import type { Container } from '../../container';
import { requireAuth } from './require-auth';
import {
  clearLegacySessionCookie,
  clearSessionCookie,
  readLegacySessionCookie,
  readSessionCookie,
  setSessionCookie,
} from './session-cookie';

export function authRouter(container: Container): Router {
  const router = Router();

  // Otherwise the old session would stay valid, out of reach of sign-out, until it expired.
  const revokeLegacySession = (req: Request, res: Response): void => {
    const token = readLegacySessionCookie(req, container.secureCookies);
    if (!token) return;
    container.logout.execute(token);
    clearLegacySessionCookie(res);
  };

  router.post('/login', async (req, res) => {
    const input = loginRequestSchema.parse(req.body);
    const result = await container.login.execute(input, req.ip ?? 'unknown');
    revokeLegacySession(req, res);
    setSessionCookie(res, result.token, { ...result, secure: container.secureCookies });
    res.json({ user: result.user });
  });

  router.post('/logout', (req, res) => {
    container.logout.execute(readSessionCookie(req, container.secureCookies));
    revokeLegacySession(req, res);
    clearSessionCookie(res, container.secureCookies);
    res.status(204).end();
  });

  router.get('/me', requireAuth(container), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
