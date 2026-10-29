import type { Database } from 'bun:sqlite';
import type { StoredUser, UserRepository } from '../../application/ports';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

const toUser = (row: UserRow): StoredUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.password_hash,
});

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  findByEmail(email: string): StoredUser | null {
    const row = this.db.query<UserRow, [string]>('SELECT * FROM users WHERE email = ?').get(email);
    return row ? toUser(row) : null;
  }

  findById(id: string): StoredUser | null {
    const row = this.db.query<UserRow, [string]>('SELECT * FROM users WHERE id = ?').get(id);
    return row ? toUser(row) : null;
  }

  create(user: StoredUser): void {
    this.db
      .query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
      .run(user.id, user.email, user.name, user.passwordHash);
  }

  updatePassword(id: string, passwordHash: string): void {
    this.db.query('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }

  count(): number {
    return this.db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n ?? 0;
  }
}
