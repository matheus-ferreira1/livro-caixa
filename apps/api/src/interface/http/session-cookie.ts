import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'lc_session';

export function setSessionCookie(
  res: Response,
  token: string,
  { persistent, expiresAt, secure }: { persistent: boolean; expiresAt: number; secure: boolean },
): void {
  const options: CookieOptions = { httpOnly: true, sameSite: 'lax', secure, path: '/' };
  // Without "remember", the cookie dies with the browser; the server still enforces expiresAt.
  if (persistent) options.expires = new Date(expiresAt);
  res.cookie(SESSION_COOKIE, token, options);
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
}

export const readSessionCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
};
