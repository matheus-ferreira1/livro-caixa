export interface Migration {
  id: string;
  sql: string;
}

/** Append-only. Never edit a migration that has shipped; add a new one instead. */
export const MIGRATIONS: Migration[] = [
  {
    id: '001_users_and_sessions',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        persistent INTEGER NOT NULL
      );
      CREATE INDEX sessions_user_id ON sessions(user_id);
    `,
  },
];
