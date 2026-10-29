import type { SessionRepository } from '../ports';
import { hashSessionToken } from './session-tokens';

export class Logout {
  constructor(private readonly sessions: SessionRepository) {}

  execute(token: string | undefined): void {
    if (token) this.sessions.delete(hashSessionToken(token));
  }
}
