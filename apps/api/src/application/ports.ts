import type { Category, MonthKey, PublicUser, Settings, Transaction } from '@livro-caixa/domain';

export interface Clock {
  now(): number;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface StoredUser extends PublicUser {
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): StoredUser | null;
  findById(id: string): StoredUser | null;
  create(user: StoredUser): void;
  updatePassword(id: string, passwordHash: string): void;
  count(): number;
}

export interface Session {
  tokenHash: string;
  userId: string;
  expiresAt: number;
  persistent: boolean;
}

export interface SessionRepository {
  create(session: Session): void;
  findByTokenHash(tokenHash: string): Session | null;
  delete(tokenHash: string): void;
  deleteForUser(userId: string): void;
  /** Deletes the sessions that expired at or before `now` and returns how many there were. */
  deleteExpired(now: number): number;
}

export interface TransactionRepository {
  listByMonth(month: MonthKey): Transaction[];
  listAll(): Transaction[];
  findById(id: string): Transaction | null;
  insert(transaction: Transaction): void;
  update(transaction: Transaction): void;
  delete(id: string): boolean;
}

export interface CategoryRepository {
  list(): Category[];
  findById(id: string): Category | null;
}

export interface SettingsRepository {
  get(): Settings;
}
