import type { Translate } from '../i18n/translate';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** The longest address the mail standards allow (RFC 5321 path limit). */
export const MAX_EMAIL_LENGTH = 254;

/**
 * The length is checked first because the pattern backtracks quadratically: on a body-sized
 * input it would block the server for seconds, and the login is open to anyone.
 */
export function isEmailAddress(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

/** Far above any real password, and it bounds what the hasher is asked to process. */
export const MAX_PASSWORD_LENGTH = 1024;

export interface LoginInput {
  email: string;
  password: string;
}

/** Returns the first validation message, or null when the input can be sent. */
export function validateLoginInput({ email, password }: LoginInput, t: Translate): string | null {
  const trimmed = email.trim();
  if (!trimmed || !password) return t('login.missingFields');
  if (!isEmailAddress(trimmed)) return t('login.invalidEmail');
  return null;
}
