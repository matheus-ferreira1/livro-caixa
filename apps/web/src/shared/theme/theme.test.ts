import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { DARK_CLASS, DARK_SCHEME_QUERY, isThemePreference, resolveTheme, THEME_STORAGE_KEY } from './theme';

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

describe('public/theme-init.js', () => {
  // The script runs before the app, so it cannot import these; this keeps the two from drifting.
  const script = readFileSync(join(__dirname, '..', '..', '..', 'public', 'theme-init.js'), 'utf8');

  test.each([THEME_STORAGE_KEY, DARK_CLASS, DARK_SCHEME_QUERY, 'light', 'dark'])('uses %s', (value) => {
    expect(script).toContain(`'${value}'`);
  });
});
