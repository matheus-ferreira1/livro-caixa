export const LOGIN_MESSAGES = {
  missingFields: 'Informe e-mail e senha.',
  invalidEmail: 'Digite um e-mail válido.',
  invalidCredentials: 'E-mail ou senha incorretos.',
  loggedOut: 'Você saiu da sua conta.',
} as const;

export const lockedOutMessage = (secondsLeft: number): string =>
  `Muitas tentativas. Tente de novo em ${secondsLeft} s.`;

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export interface LoginInput {
  email: string;
  password: string;
}

/** Returns the first pt-BR validation message, or null when the input can be sent. */
export function validateLoginInput({ email, password }: LoginInput): string | null {
  const trimmed = email.trim();
  if (!trimmed || !password) return LOGIN_MESSAGES.missingFields;
  if (!EMAIL_PATTERN.test(trimmed)) return LOGIN_MESSAGES.invalidEmail;
  return null;
}
