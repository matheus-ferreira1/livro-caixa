import type { Database } from 'bun:sqlite';
import type { Session, SessionRepository } from '../../application/ports';

interface SessionRow {
  token_hash: string;
  user_id: string;
  expires_at: number;
  persistent: number;
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  create(session: Session): void {
    this.db
      .query('INSERT INTO sessions (token_hash, user_id, expires_at, persistent) VALUES (?, ?, ?, ?)')
      .run(session.tokenHash, session.userId, session.expiresAt, session.persistent ? 1 : 0);
  }

  findByTokenHash(tokenHash: string): Session | null {
    const row = this.db
      .query<SessionRow, [string]>('SELECT * FROM sessions WHERE token_hash = ?')
      .get(tokenHash);
    return row
      ? {
          tokenHash: row.token_hash,
          userId: row.user_id,
          expiresAt: row.expires_at,
          persistent: row.persistent === 1,
        }
      : null;
  }

  delete(tokenHash: string): void {
    this.db.query('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  deleteForUser(userId: string): void {
    this.db.query('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}
