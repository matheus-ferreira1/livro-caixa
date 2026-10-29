import { describe, expect, test } from 'bun:test';
import { LOGIN_MESSAGES, validateLoginInput } from './credentials';

describe('validateLoginInput', () => {
  test('requires both e-mail and password', () => {
    expect(validateLoginInput({ email: '  ', password: 'secret123' })).toBe(LOGIN_MESSAGES.missingFields);
    expect(validateLoginInput({ email: 'a@b.co', password: '' })).toBe(LOGIN_MESSAGES.missingFields);
  });

  test('rejects malformed e-mails', () => {
    expect(validateLoginInput({ email: 'not-an-email', password: 'secret123' })).toBe(
      LOGIN_MESSAGES.invalidEmail,
    );
  });

  test('accepts a well-formed e-mail with surrounding spaces', () => {
    expect(validateLoginInput({ email: ' ana@casa.dev ', password: 'secret123' })).toBeNull();
  });
});
