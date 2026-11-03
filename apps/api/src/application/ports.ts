import type {
  Asset,
  Category,
  MonthKey,
  PublicUser,
  Settings,
  Snapshot,
  Transaction,
} from '@livro-caixa/domain';

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
  /** Inserts all of them or, on any failure, none. */
  insertMany(transactions: Transaction[]): void;
  update(transaction: Transaction): void;
  delete(id: string): boolean;
}

export interface CategoryRepository {
  list(): Category[];
  findById(id: string): Category | null;
  insert(category: Category): void;
  update(category: Category): void;
  delete(id: string): void;
}

export interface SettingsRepository {
  get(): Settings;
  save(settings: Settings): void;
}

export interface AssetRepository {
  /** In the order they were added, which fixes each institution's color. */
  list(): Asset[];
  findById(id: string): Asset | null;
  insert(asset: Asset): void;
  update(asset: Asset): void;
  delete(id: string): boolean;
}

export interface SnapshotRepository {
  /** Oldest first. */
  list(): Snapshot[];
  insert(snapshot: Snapshot): void;
  /** Adds the closing and updates its assets together or, on any failure, not at all. */
  registerClosing(snapshot: Snapshot, assets: Asset[]): void;
}
