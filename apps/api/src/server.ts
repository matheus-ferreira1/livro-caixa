import { bootstrap, ensureAdminUser } from './bootstrap';
import { loadConfig } from './config';
import { createApp } from './interface/http/app';
import { startSessionPurge } from './session-purge';

const config = loadConfig();
const container = bootstrap(config);
await ensureAdminUser(container, config);
startSessionPurge(container.purgeExpiredSessions);

createApp(container, { staticDir: config.STATIC_DIR }).listen(config.PORT, () => {
  console.info(`Livro-caixa listening on http://localhost:${config.PORT}`);
});
