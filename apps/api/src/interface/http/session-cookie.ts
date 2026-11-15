import type { CookieOptions, Request, Response } from 'express';

const SESSION_COOKIE = 'lc_session';

/**
 * Over HTTPS the cookie carries the `__Host-` prefix: the browser then only accepts it from this
 * exact host, with Secure and no Domain, so another subdomain of the same site cannot plant a
 * session. Browsers refuse the prefix without Secure, so plain HTTP keeps the bare name.
 */
const sessionCookieName = (secure: boolean): string => (secure ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE);

const baseOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
});

export function setSessionCookie(
  res: Response,
  token: string,
  { persistent, expiresAt, secure }: { persistent: boolean; expiresAt: number; secure: boolean },
): void {
  const options = baseOptions(secure);
  // Without "remember", the cookie dies with the browser; the server still enforces expiresAt.
  if (persistent) options.expires = new Date(expiresAt);
  res.cookie(sessionCookieName(secure), token, options);
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(sessionCookieName(secure), baseOptions(secure));
}

export const readSessionCookie = (req: Request, secure: boolean): string | undefined => {
  const value: unknown = req.cookies?.[sessionCookieName(secure)];
  return typeof value === 'string' ? value : undefined;
};
