import { LOGIN_MESSAGES, lockedOutMessage, type LoginRequest, type PublicUser } from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { Clock, PasswordHasher, SessionRepository, UserRepository } from '../ports';
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

export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly throttle: LoginThrottle,
    private readonly clock: Clock,
  ) {}

  async execute(input: LoginRequest, clientKey: string): Promise<LoginResult> {
    const throttleKey = `${input.email}|${clientKey}`;
    this.assertNotLocked(throttleKey);

    const user = this.users.findByEmail(input.email);
    const valid = await this.hasher.verify(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      const locked = this.throttle.registerFailure(throttleKey);
      if (locked) this.assertNotLocked(throttleKey);
      throw new ApplicationError('invalid_credentials', LOGIN_MESSAGES.invalidCredentials);
    }

    this.throttle.reset(throttleKey);
    return this.openSession({ id: user.id, email: user.email, name: user.name }, input.remember);
  }

  private assertNotLocked(key: string): void {
    const seconds = this.throttle.secondsLocked(key);
    if (seconds > 0) throw new ApplicationError('too_many_attempts', lockedOutMessage(seconds));
  }

  private openSession(user: PublicUser, persistent: boolean): LoginResult {
    const token = newSessionToken();
    const expiresAt = this.clock.now() + (persistent ? PERSISTENT_SESSION_MS : BROWSER_SESSION_MS);
    this.sessions.create({ tokenHash: hashSessionToken(token), userId: user.id, expiresAt, persistent });
    return { user, token, expiresAt, persistent };
  }
}
