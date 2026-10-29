import type { PublicUser } from '@livro-caixa/domain';

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
}
