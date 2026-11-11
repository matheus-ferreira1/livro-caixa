import { rmSync } from 'node:fs';

const DATABASE_PATH = process.env.DATABASE_PATH;
if (!DATABASE_PATH) throw new Error('DATABASE_PATH is not set, so there is no capture database to remove.');

// SQLite in WAL mode keeps two side files next to the database.
for (const suffix of ['', '-wal', '-shm']) rmSync(`${DATABASE_PATH}${suffix}`, { force: true });
