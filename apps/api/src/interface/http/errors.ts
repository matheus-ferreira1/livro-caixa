import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApplicationError, type ApplicationErrorCode } from '../../application/errors';

const STATUS_BY_CODE: Record<ApplicationErrorCode, number> = {
  validation_error: 400,
  invalid_credentials: 401,
  unauthenticated: 401,
  not_found: 404,
  conflict: 409,
  too_many_attempts: 429,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: { code: 'validation_error', message: 'Dados inválidos.', issues: err.issues } });
    return;
  }
  if (err instanceof ApplicationError) {
    res.status(STATUS_BY_CODE[err.code]).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Erro inesperado. Tente novamente.' } });
};
