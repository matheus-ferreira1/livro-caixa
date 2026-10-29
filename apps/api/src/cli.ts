import { nameFromEmail } from '@livro-caixa/domain';
import { bootstrap } from './bootstrap';
import { loadConfig } from './config';

const USAGE = `Usage:
  bun run cli create-user <email> [name]   Prompts for the password
  bun run cli reset-password <email>       Prompts for the new password`;

async function readPassword(): Promise<string> {
  const fromEnv = process.env.NEW_PASSWORD;
  if (fromEnv) return fromEnv;
  const answer = prompt('Password (min. 8 characters):');
  return answer ?? '';
}

async function main(argv: string[]): Promise<number> {
  const [command, email, ...rest] = argv;
  if (!command || !email) {
    console.error(USAGE);
    return 1;
  }
  const container = bootstrap(loadConfig());
  switch (command) {
    case 'create-user': {
      const name = rest.join(' ') || nameFromEmail(email);
      await container.createUser.execute({ email, name, password: await readPassword() });
      console.info(`Created user ${email}`);
      return 0;
    }
    case 'reset-password':
      await container.resetPassword.execute({ email, password: await readPassword() });
      console.info(`Password reset for ${email}. Existing sessions were signed out.`);
      return 0;
    default:
      console.error(USAGE);
      return 1;
  }
}

try {
  process.exit(await main(process.argv.slice(2)));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
