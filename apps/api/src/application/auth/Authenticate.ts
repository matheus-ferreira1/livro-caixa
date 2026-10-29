import type { PublicUser } from '@livro-caixa/domain';
import type { Clock, SessionRepository, UserRepository } from '../ports';
import { hashSessionToken } from './session-tokens';

/** Resolves a session cookie to its user, dropping expired sessions. */
export class Authenticate {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  execute(token: string | undefined): PublicUser | null {
    if (!token) return null;
    const tokenHash = hashSessionToken(token);
    const session = this.sessions.findByTokenHash(tokenHash);
    if (!session) return null;
    if (session.expiresAt <= this.clock.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const user = this.users.findById(session.userId);
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  }
}
