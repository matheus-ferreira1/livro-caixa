import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { nameFromEmail } from '@livro-caixa/domain';
import type { Config } from './config';
import { createContainer } from './container';
import { openDatabase } from './infrastructure/db/database';
import { BrapiQuoteProvider } from './infrastructure/quotes/BrapiQuoteProvider';

export function bootstrap(config: Config) {
  if (config.DATABASE_PATH !== ':memory:') mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });
  return createContainer({
    db: openDatabase(config.DATABASE_PATH),
    secureCookies: config.SECURE_COOKIES,
    quoteProvider: config.BRAPI_TOKEN ? new BrapiQuoteProvider(config.BRAPI_TOKEN) : null,
  });
}

/** Creates the first account from ADMIN_* env vars when the instance has no users yet. */
export async function ensureAdminUser(
  container: ReturnType<typeof bootstrap>,
  config: Config,
): Promise<void> {
  if (container.users.count() > 0) return;
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    console.warn(
      'No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, or run: bun run cli create-user <email> <name>',
    );
    return;
  }
  await container.createUser.execute({
    email: config.ADMIN_EMAIL,
    name: config.ADMIN_NAME ?? nameFromEmail(config.ADMIN_EMAIL),
    password: config.ADMIN_PASSWORD,
  });
  console.info(`Created admin user ${config.ADMIN_EMAIL}`);
}
