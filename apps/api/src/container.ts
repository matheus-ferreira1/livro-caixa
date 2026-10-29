import type { Database } from 'bun:sqlite';
import { Authenticate } from './application/auth/Authenticate';
import { Login } from './application/auth/Login';
import { LoginThrottle } from './application/auth/LoginThrottle';
import { Logout } from './application/auth/Logout';
import { CreateUser, ResetPassword } from './application/auth/user-admin';
import type { Clock } from './application/ports';
import { DeleteTransaction, ToggleTransactionFlags } from './application/transactions/commands';
import { ListMonthTransactions, SearchTransactions } from './application/transactions/queries';
import {
  SqliteCategoryRepository,
  SqliteSettingsRepository,
} from './infrastructure/repositories/SqliteLedgerSetupRepositories';
import { SqliteSessionRepository } from './infrastructure/repositories/SqliteSessionRepository';
import { SqliteTransactionRepository } from './infrastructure/repositories/SqliteTransactionRepository';
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
  const transactions = new SqliteTransactionRepository(db);

  return {
    secureCookies,
    users,
    login: new Login(users, sessions, hasher, throttle, clock),
    logout: new Logout(sessions),
    authenticate: new Authenticate(users, sessions, clock),
    createUser: new CreateUser(users, hasher),
    resetPassword: new ResetPassword(users, sessions, hasher),
    transactions,
    categories: new SqliteCategoryRepository(db),
    settings: new SqliteSettingsRepository(db),
    listMonthTransactions: new ListMonthTransactions(transactions),
    searchTransactions: new SearchTransactions(transactions),
    toggleTransactionFlags: new ToggleTransactionFlags(transactions),
    deleteTransaction: new DeleteTransaction(transactions),
  };
}

export type Container = ReturnType<typeof createContainer>;
