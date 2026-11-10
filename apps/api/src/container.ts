import type { Database } from 'bun:sqlite';
import { Authenticate } from './application/auth/Authenticate';
import { Login } from './application/auth/Login';
import { ACCOUNT_THROTTLE_POLICY, IP_THROTTLE_POLICY, LoginThrottle } from './application/auth/LoginThrottle';
import { Logout } from './application/auth/Logout';
import { PurgeExpiredSessions } from './application/auth/PurgeExpiredSessions';
import { CreateUser, ResetPassword } from './application/auth/user-admin';
import { CreateCategory, DeleteCategory, UpdateCategory } from './application/categories/commands';
import { ListCategories } from './application/categories/queries';
import { GetDashboard } from './application/dashboard/queries';
import type { Clock, PasswordHasher, QuoteProvider } from './application/ports';
import { GenerateRecurring, ListRecurringCandidates } from './application/recurring/recurring';
import { UpdateSettings } from './application/settings/UpdateSettings';
import { GetYearSummary } from './application/summary/queries';
import {
  DeleteTransaction,
  SaveTransaction,
  ToggleTransactionFlags,
} from './application/transactions/commands';
import { ListMonthTransactions, SearchTransactions } from './application/transactions/queries';
import { CreateAsset, DeleteAsset, RegisterClosing, UpdateAsset } from './application/wealth/commands';
import { GetWealth } from './application/wealth/queries';
import { RefreshQuotes } from './application/wealth/RefreshQuotes';
import {
  SqliteCategoryRepository,
  SqliteSettingsRepository,
} from './infrastructure/repositories/SqliteLedgerSetupRepositories';
import { SqliteSessionRepository } from './infrastructure/repositories/SqliteSessionRepository';
import { SqliteTransactionRepository } from './infrastructure/repositories/SqliteTransactionRepository';
import { SqliteUserRepository } from './infrastructure/repositories/SqliteUserRepository';
import {
  SqliteAssetRepository,
  SqliteSnapshotRepository,
} from './infrastructure/repositories/SqliteWealthRepositories';
import { BunPasswordHasher, SystemClock } from './infrastructure/system';

export interface ContainerOptions {
  db: Database;
  clock?: Clock;
  hasher?: PasswordHasher;
  secureCookies: boolean;
  /** Null keeps the instance from making any outbound request; prices stay as typed. */
  quoteProvider?: QuoteProvider | null;
}

/** Composition root: the only place that knows which adapter backs each port. */
export function createContainer({
  db,
  clock = new SystemClock(),
  hasher = new BunPasswordHasher(),
  secureCookies,
  quoteProvider = null,
}: ContainerOptions) {
  const users = new SqliteUserRepository(db);
  const sessions = new SqliteSessionRepository(db);
  const accountThrottle = new LoginThrottle(clock, ACCOUNT_THROTTLE_POLICY);
  const ipThrottle = new LoginThrottle(clock, IP_THROTTLE_POLICY);
  const transactions = new SqliteTransactionRepository(db);
  const categories = new SqliteCategoryRepository(db);
  const settings = new SqliteSettingsRepository(db);
  const assets = new SqliteAssetRepository(db);
  const snapshots = new SqliteSnapshotRepository(db, assets);

  return {
    secureCookies,
    users,
    login: new Login(users, sessions, hasher, accountThrottle, ipThrottle, clock),
    logout: new Logout(sessions),
    authenticate: new Authenticate(users, sessions, clock),
    purgeExpiredSessions: new PurgeExpiredSessions(sessions, clock),
    createUser: new CreateUser(users, hasher),
    resetPassword: new ResetPassword(users, sessions, hasher),
    transactions,
    categories,
    settings,
    listCategories: new ListCategories(categories, transactions),
    createCategory: new CreateCategory(categories),
    updateCategory: new UpdateCategory(categories),
    deleteCategory: new DeleteCategory(categories, transactions),
    updateSettings: new UpdateSettings(settings),
    listMonthTransactions: new ListMonthTransactions(transactions),
    searchTransactions: new SearchTransactions(transactions),
    toggleTransactionFlags: new ToggleTransactionFlags(transactions),
    deleteTransaction: new DeleteTransaction(transactions),
    saveTransaction: new SaveTransaction(transactions, categories),
    listRecurringCandidates: new ListRecurringCandidates(transactions),
    generateRecurring: new GenerateRecurring(transactions),
    getYearSummary: new GetYearSummary(transactions, settings),
    getDashboard: new GetDashboard(transactions, categories, settings),
    assets,
    snapshots,
    getWealth: new GetWealth(assets, snapshots),
    refreshQuotes: new RefreshQuotes(assets, quoteProvider, clock),
    createAsset: new CreateAsset(assets),
    updateAsset: new UpdateAsset(assets),
    deleteAsset: new DeleteAsset(assets),
    registerClosing: new RegisterClosing(assets, snapshots),
  };
}

export type Container = ReturnType<typeof createContainer>;
