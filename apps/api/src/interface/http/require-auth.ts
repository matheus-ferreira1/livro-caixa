import type { PublicUser } from '@livro-caixa/domain';
import type { RequestHandler } from 'express';
import type { Container } from '../../container';
import { ApplicationError } from '../../application/errors';
import { readSessionCookie } from './session-cookie';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express request augmentation requires it
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export const requireAuth =
  (container: Container): RequestHandler =>
  (req, _res, next) => {
    const user = container.authenticate.execute(readSessionCookie(req));
    if (!user) {
      next(new ApplicationError('unauthenticated', container.translate()('api.sessionExpired')));
      return;
    }
    req.user = user;
    next();
  };
