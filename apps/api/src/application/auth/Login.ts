import type { LoginRequest, PublicUser } from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { Clock, PasswordHasher, SessionRepository, TranslateProvider, UserRepository } from '../ports';
import { KeyedQueue } from './KeyedQueue';
import type { LoginThrottle } from './LoginThrottle';
import {
  BROWSER_SESSION_MS,
  hashSessionToken,
  newSessionToken,
  PERSISTENT_SESSION_MS,
} from './session-tokens';

export interface LoginResult {
  user: PublicUser;
  token: string;
  expiresAt: number;
  persistent: boolean;
}

// Verified against when the e-mail is unknown, so both paths take the same time.
const DUMMY_HASH = await Bun.password.hash('timing-equalizer');

export interface LoginThrottles {
  /** Keyed by e-mail + client IP. */
  account: LoginThrottle;
  /** Keyed by client IP. */
  ip: LoginThrottle;
  /** Keyed by e-mail. */
  email: LoginThrottle;
}

export class Login {
  private readonly attemptsByClient = new KeyedQueue();
  private readonly checksInFlightByEmail = new Map<string, number>();

  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly throttles: LoginThrottles,
    private readonly clock: Clock,
    private readonly translate: TranslateProvider,
  ) {}

  /**
   * One attempt per client at a time. Checking a password takes a while, so attempts sent
   * together would all pass the lock check before the first failure was counted.
   */
  execute(input: LoginRequest, clientKey: string): Promise<LoginResult> {
    return this.attemptsByClient.run(clientKey, () => this.attempt(input, clientKey));
  }

  private async attempt(input: LoginRequest, clientKey: string): Promise<LoginResult> {
    const accountKey = `${input.email}|${clientKey}`;
    this.assertNotLocked(accountKey, clientKey, input.email);

    const user = this.users.findByEmail(input.email);
    const valid = await this.verifyWithinEmailLimit(
      input.email,
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      this.throttles.account.registerFailure(accountKey);
      this.throttles.ip.registerFailure(clientKey);
      this.throttles.email.registerFailure(input.email);
      this.assertNotLocked(accountKey, clientKey, input.email);
      throw new ApplicationError('invalid_credentials', this.translate()('login.invalidCredentials'));
    }

    // The IP counter is not reset on success: a sprayer who knows one valid login must
    // not be able to clear its own failures with it.
    this.throttles.account.reset(accountKey);
    this.throttles.email.reset(input.email);
    return this.openSession({ id: user.id, email: user.email, name: user.name }, input.remember);
  }

  /**
   * Attempts are queued per client, so guesses for one e-mail sent together from many addresses
   * are checked at the same time, all before any of them counts as a failure. Each check in
   * flight therefore takes one of the failures the e-mail has left. The e-mail is not queued
   * instead, because the owner would then wait behind an attacker's guesses.
   */
  private async verifyWithinEmailLimit(email: string, password: string, hash: string): Promise<boolean> {
    const inFlight = this.checksInFlightByEmail.get(email) ?? 0;
    if (inFlight >= this.throttles.email.failuresLeft(email)) {
      throw new ApplicationError(
        'too_many_attempts',
        this.translate()('login.lockedOut', this.throttles.email.lockSeconds),
      );
    }
    this.checksInFlightByEmail.set(email, inFlight + 1);
    try {
      return await this.hasher.verify(password, hash);
    } finally {
      const remaining = (this.checksInFlightByEmail.get(email) ?? 1) - 1;
      if (remaining > 0) this.checksInFlightByEmail.set(email, remaining);
      else this.checksInFlightByEmail.delete(email);
    }
  }

  private assertNotLocked(accountKey: string, clientKey: string, email: string): void {
    const seconds = Math.max(
      this.throttles.account.secondsLocked(accountKey),
      this.throttles.ip.secondsLocked(clientKey),
      this.throttles.email.secondsLocked(email),
    );
    if (seconds > 0)
      throw new ApplicationError('too_many_attempts', this.translate()('login.lockedOut', seconds));
  }

  private openSession(user: PublicUser, persistent: boolean): LoginResult {
    const token = newSessionToken();
    const expiresAt = this.clock.now() + (persistent ? PERSISTENT_SESSION_MS : BROWSER_SESSION_MS);
    this.sessions.create({ tokenHash: hashSessionToken(token), userId: user.id, expiresAt, persistent });
    return { user, token, expiresAt, persistent };
  }
}
