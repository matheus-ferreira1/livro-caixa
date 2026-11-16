import type { RequestHandler } from 'express';
import { ApplicationError } from '../../application/errors';
import type { TranslateProvider } from '../../application/ports';

/**
 * Everything the app loads comes from its own origin: the bundle, the fonts and the API.
 * Inline styles stay allowed because components position charts and bars with `style`.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  // For browsers that predate frame-ancestors.
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Headers for every response. HSTS is sent only when the instance says it is behind HTTPS:
 * on plain HTTP browsers ignore it, and a LAN install must not be told to expect TLS.
 */
export function securityHeaders({ https }: { https: boolean }): RequestHandler {
  const headers = https
    ? { ...SECURITY_HEADERS, 'Strict-Transport-Security': `max-age=${ONE_YEAR_SECONDS}` }
    : SECURITY_HEADERS;
  return (_req, res, next) => {
    res.set(headers);
    next();
  };
}

const INSECURE_COOKIES_WARNING =
  'This instance is reached over HTTPS but SECURE_COOKIES is not true, so the session cookie is also sent ' +
  'over plain HTTP. Set SECURE_COOKIES=true and restart.';

/**
 * Says once that a proxy is terminating TLS while cookies are not marked Secure. The header is
 * read as sent, whatever TRUST_PROXY says: a forged one only costs a log line.
 */
export function warnWhenCookiesAreInsecure({ secureCookies }: { secureCookies: boolean }): RequestHandler {
  let pending = !secureCookies;
  return (req, _res, next) => {
    if (pending && req.get('X-Forwarded-Proto') === 'https') {
      pending = false;
      console.warn(INSECURE_COOKIES_WARNING);
    }
    next();
  };
}

/** API answers hold the household's finances, so no browser or proxy cache may keep them. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** `none` is a request the user started themselves: a typed address or a bookmark. */
const OWN_FETCH_SITES = new Set(['same-origin', 'none']);

/**
 * Refuses writes that a browser says come from another origin. SameSite=Lax already stops other
 * sites, but not a sibling subdomain, which counts as the same site. Clients that do not send
 * Sec-Fetch-Site (the CLI, scripts, old browsers) are let through: they cannot be made to carry
 * a victim's cookie, which is what this guards.
 */
export const rejectCrossSiteWrites =
  (translate: TranslateProvider): RequestHandler =>
  (req, _res, next) => {
    const fetchSite = req.get('Sec-Fetch-Site');
    const foreign = fetchSite !== undefined && !OWN_FETCH_SITES.has(fetchSite);
    if (foreign && !READ_METHODS.has(req.method)) {
      next(new ApplicationError('forbidden', translate()('api.invalidData')));
      return;
    }
    next();
  };
