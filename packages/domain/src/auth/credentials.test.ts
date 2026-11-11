import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/translate';
import { validateLoginInput } from './credentials';

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
