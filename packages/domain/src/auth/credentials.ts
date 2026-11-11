import type { Translate } from '../i18n/translate';

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export interface LoginInput {
  email: string;
  password: string;
}

/** Returns the first validation message, or null when the input can be sent. */
export function validateLoginInput({ email, password }: LoginInput, t: Translate): string | null {
  const trimmed = email.trim();
  if (!trimmed || !password) return t('login.missingFields');
  if (!EMAIL_PATTERN.test(trimmed)) return t('login.invalidEmail');
  return null;
}
