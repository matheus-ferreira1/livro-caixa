import { describe, expect, test } from 'bun:test';
import { initialsOf, nameFromEmail } from './user-display';

describe('nameFromEmail', () => {
  test('title-cases the local part split on separators', () => {
    expect(nameFromEmail('maria.silva@casa.dev')).toBe('Maria Silva');
    expect(nameFromEmail('admin@livro-caixa.local')).toBe('Admin');
  });
});

describe('initialsOf', () => {
  test('uses the first letters of the first two words', () => {
    expect(initialsOf('Maria Silva Souza')).toBe('MS');
  });

  test('uses the first two letters of a single word', () => {
    expect(initialsOf('Admin')).toBe('AD');
  });

  test('falls back for empty names', () => {
    expect(initialsOf('  ')).toBe('?');
  });
});
