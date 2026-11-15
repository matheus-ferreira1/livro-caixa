import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/translate';
import { isEmailAddress, MAX_EMAIL_LENGTH, validateLoginInput } from './credentials';

const t = translator('pt-BR');

describe('validateLoginInput', () => {
  test('requires both e-mail and password', () => {
    expect(validateLoginInput({ email: '  ', password: 'secret123' }, t)).toBe(t('login.missingFields'));
    expect(validateLoginInput({ email: 'a@b.co', password: '' }, t)).toBe(t('login.missingFields'));
  });

  test('rejects malformed e-mails', () => {
    expect(validateLoginInput({ email: 'not-an-email', password: 'secret123' }, t)).toBe(
      t('login.invalidEmail'),
    );
  });

  test('accepts a well-formed e-mail with surrounding spaces', () => {
    expect(validateLoginInput({ email: ' ana@casa.dev ', password: 'secret123' }, t)).toBeNull();
  });
});

describe('isEmailAddress', () => {
  const MAX_CHECK_MS = 100;

  test('accepts an address at the length limit and rejects one past it', () => {
    const domain = '@casa.dev';
    expect(isEmailAddress('a'.repeat(MAX_EMAIL_LENGTH - domain.length) + domain)).toBe(true);
    expect(isEmailAddress('a'.repeat(MAX_EMAIL_LENGTH - domain.length + 1) + domain)).toBe(false);
  });

  test('rejects an oversized address without running the pattern over it', () => {
    // The pattern backtracks quadratically on this shape: seconds for a body-sized input.
    const hostile = `a@${'.'.repeat(90_000)} x`;
    const startedAt = performance.now();

    expect(isEmailAddress(hostile)).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(MAX_CHECK_MS);
  });
});
