import { DEFAULT_LANGUAGE, translator } from '@livro-caixa/domain';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApplicationError, type ApplicationErrorCode } from '../../application/errors';
import type { TranslateProvider } from '../../application/ports';

const STATUS_BY_CODE: Record<ApplicationErrorCode, number> = {
  validation_error: 400,
  invalid_credentials: 401,
  unauthenticated: 401,
  not_found: 404,
  conflict: 409,
  too_many_attempts: 429,
};

export const errorHandler =
  (translate: TranslateProvider): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: { code: 'validation_error', message: translate()('api.invalidData'), issues: err.issues },
      });
      return;
    }
    if (err instanceof ApplicationError) {
      res.status(STATUS_BY_CODE[err.code]).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'internal_error', message: unexpectedMessage(translate) } });
  };

/** The 500 path must not throw, and a failing settings read may be the very error being reported. */
function unexpectedMessage(translate: TranslateProvider): string {
  try {
    return translate()('api.unexpected');
  } catch {
    return translator(DEFAULT_LANGUAGE)('api.unexpected');
  }
}
