import { describe, expect, test } from 'vitest';
import { isThemePreference, resolveTheme } from './theme';

describe('resolveTheme', () => {
  test.each([
    ['system', true, 'dark'],
    ['system', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('%s with a dark system = %s gives %s', (preference, systemPrefersDark, expected) => {
    expect(resolveTheme(preference, systemPrefersDark)).toBe(expected);
  });
});

describe('isThemePreference', () => {
  test.each(['system', 'light', 'dark'])('accepts %s', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  test.each(['', 'Dark', 'auto', null])('rejects %p', (value) => {
    expect(isThemePreference(value)).toBe(false);
  });
});
