import { randomUUID } from 'node:crypto';
import { MAX_PASSWORD_LENGTH } from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { PasswordHasher, SessionRepository, UserRepository } from '../ports';

export const MIN_PASSWORD_LENGTH = 12;

function assertPasswordStrength(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApplicationError(
      'validation_error',
      `Password must have at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  // The sign-in request refuses anything longer, so such a password could never be used.
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApplicationError(
      'validation_error',
      `Password must have at most ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
}

export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: { email: string; name: string; password: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    assertPasswordStrength(input.password);
    if (this.users.findByEmail(email)) throw new ApplicationError('conflict', `User ${email} already exists`);
    this.users.create({
      id: randomUUID(),
      email,
      name: input.name.trim(),
      passwordHash: await this.hasher.hash(input.password),
    });
  }
}

export class ResetPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: { email: string; password: string }): Promise<void> {
    assertPasswordStrength(input.password);
    const user = this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user) throw new ApplicationError('not_found', `User ${input.email} not found`);
    this.users.updatePassword(user.id, await this.hasher.hash(input.password));
    this.sessions.deleteForUser(user.id);
  }
}
