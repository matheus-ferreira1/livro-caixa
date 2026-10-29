import type { Clock, PasswordHasher } from '../application/ports';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class BunPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Bun.password.hash(plain, { algorithm: 'argon2id' });
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plain, hash);
  }
}
