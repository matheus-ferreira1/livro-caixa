export type ApplicationErrorCode =
  | 'validation_error'
  | 'invalid_credentials'
  | 'too_many_attempts'
  | 'unauthenticated'
  | 'not_found'
  | 'conflict';

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
