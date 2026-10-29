import { createHash, randomBytes } from 'node:crypto';

export const PERSISTENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000;

export const newSessionToken = (): string => randomBytes(32).toString('base64url');

/** Only the hash is stored, so a leaked database cannot be replayed as cookies. */
export const hashSessionToken = (token: string): string => createHash('sha256').update(token).digest('hex');
