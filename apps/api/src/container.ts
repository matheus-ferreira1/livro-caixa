import type { Database } from 'bun:sqlite';
import { Authenticate } from './application/auth/Authenticate';
import { Login } from './application/auth/Login';
import { LoginThrottle } from './application/auth/LoginThrottle';
import { Logout } from './application/auth/Logout';
import { CreateUser, ResetPassword } from './application/auth/user-admin';
import type { Clock } from './application/ports';
import { SqliteSessionRepository } from './infrastructure/repositories/SqliteSessionRepository';
import { SqliteUserRepository } from './infrastructure/repositories/SqliteUserRepository';
import { BunPasswordHasher, SystemClock } from './infrastructure/system';

export interface ContainerOptions {
  db: Database;
  clock?: Clock;
  secureCookies: boolean;
}

/** Composition root: the only place that knows which adapter backs each port. */
export function createContainer({ db, clock = new SystemClock(), secureCookies }: ContainerOptions) {
  const users = new SqliteUserRepository(db);
  const sessions = new SqliteSessionRepository(db);
  const hasher = new BunPasswordHasher();
  const throttle = new LoginThrottle(clock);

  return {
    secureCookies,
    users,
    login: new Login(users, sessions, hasher, throttle, clock),
    logout: new Logout(sessions),
    authenticate: new Authenticate(users, sessions, clock),
    createUser: new CreateUser(users, hasher),
    resetPassword: new ResetPassword(users, sessions, hasher),
  };
}

export type Container = ReturnType<typeof createContainer>;
