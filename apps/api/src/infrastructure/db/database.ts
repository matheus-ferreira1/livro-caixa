import { Database } from 'bun:sqlite';
import { MIGRATIONS } from './migrations';

export function openDatabase(path: string): Database {
  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY)');
  const applied = new Set(
    db
      .query<{ id: string }, []>('SELECT id FROM schema_migrations')
      .all()
      .map((row) => row.id),
  );
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      db.query('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
    })();
  }
}
