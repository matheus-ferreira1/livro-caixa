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

const MIN_CLIENT_ERROR_STATUS = 400;
const MAX_CLIENT_ERROR_STATUS = 499;
const NOT_FOUND_STATUS = 404;

// Errors from Express middleware and `send` (http-errors) carry the HTTP status they stand for.
// Only an integer in the 4xx range is trusted; anything else is treated as a server fault.
function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('status' in err)) return undefined;
  const { status } = err;
  const isClientError =
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= MIN_CLIENT_ERROR_STATUS &&
    status <= MAX_CLIENT_ERROR_STATUS;
  return isClientError ? status : undefined;
}

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
    const status = clientErrorStatus(err);
    if (status !== undefined) {
      // The raw message of a framework error is never sent: only the generic catalog text.
      const notFound = status === NOT_FOUND_STATUS;
      res.status(status).json({
        error: {
          code: notFound ? 'not_found' : 'validation_error',
          message: translate()(notFound ? 'api.routeNotFound' : 'api.invalidData'),
        },
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'internal_error', message: translate()('api.unexpected') } });
  };
