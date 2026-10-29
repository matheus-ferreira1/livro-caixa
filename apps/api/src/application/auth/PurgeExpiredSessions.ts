import type { Clock, SessionRepository } from '../ports';

/**
 * Removes sessions nobody will use again. `Authenticate` only drops an expired session when its
 * cookie comes back, so abandoned ones would otherwise stay in the table forever.
 */
export class PurgeExpiredSessions {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  execute(): number {
    return this.sessions.deleteExpired(this.clock.now());
  }
}
