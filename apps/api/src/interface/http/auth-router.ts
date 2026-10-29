import { loginRequestSchema } from '@livro-caixa/domain';
import { Router } from 'express';
import type { Container } from '../../container';
import { requireAuth } from './require-auth';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from './session-cookie';

export function authRouter(container: Container): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const input = loginRequestSchema.parse(req.body);
    const result = await container.login.execute(input, req.ip ?? 'unknown');
    setSessionCookie(res, result.token, { ...result, secure: container.secureCookies });
    res.json({ user: result.user });
  });

  router.post('/logout', (req, res) => {
    container.logout.execute(readSessionCookie(req));
    clearSessionCookie(res, container.secureCookies);
    res.status(204).end();
  });

  router.get('/me', requireAuth(container), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
