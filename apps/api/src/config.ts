import { isIP } from 'node:net';
import { z } from 'zod';

/** What Express accepts for `trust proxy`: all, none, a hop count, or a list of addresses. */
export type TrustProxy = boolean | number | string;

export const DEFAULT_TRUST_PROXY = 'loopback';

const NAMED_SUBNETS = new Set(['loopback', 'linklocal', 'uniquelocal']);
const MAX_PREFIX_BY_IP_VERSION: Record<number, number> = { 4: 32, 6: 128 };
const HOP_COUNT = /^\d+$/;
const PREFIX_LENGTH = /^\d{1,3}$/;

// Only the CIDR form is accepted, not proxy-addr's netmask form (10.0.0.0/255.0.0.0), to keep one way to write it.
function isTrustedAddress(entry: string): boolean {
  if (NAMED_SUBNETS.has(entry)) return true;
  const [address = '', prefix, ...rest] = entry.split('/');
  const version = isIP(address);
  if (version === 0 || rest.length > 0) return false;
  if (prefix === undefined) return true;
  const maxPrefix = MAX_PREFIX_BY_IP_VERSION[version] ?? 0;
  return PREFIX_LENGTH.test(prefix) && Number(prefix) <= maxPrefix;
}

const trustProxySchema = z
  .string()
  .default(DEFAULT_TRUST_PROXY)
  .transform((raw, ctx): TrustProxy => {
    const value = raw.trim();
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (HOP_COUNT.test(value)) return Number(value);
    const entries = value.split(',').map((entry) => entry.trim());
    if (!entries.every(isTrustedAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'TRUST_PROXY must be true, false, a hop count, or a comma-separated list of IPs, CIDRs, loopback, linklocal or uniquelocal',
      });
      return z.NEVER;
    }
    return entries.join(',');
  });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().default('./data/livro-caixa.sqlite'),
  STATIC_DIR: z.string().optional(),
  SECURE_COOKIES: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  TRUST_PROXY: trustProxySchema,
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => envSchema.parse(env);
