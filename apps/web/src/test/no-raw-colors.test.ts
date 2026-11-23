import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const SOURCE_ROOT = join(__dirname, '..');

/**
 * Colors that ignore the theme. `bg-ink` and `text-background` are banned because ink and the page
 * background swap lightness in dark mode: a surface that must stay dark uses `surface-strong`.
 */
const RAW_COLOR_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['bg-ink (use bg-surface-strong or bg-primary)', /\bbg-ink(?![/\w-])/],
  ['text-white', /\btext-white\b/],
  ['text-background', /\btext-background\b/],
  ['hex color', /#[0-9a-fA-F]{6}\b/],
  ['rgba()', /rgba?\(/],
];

/** User-data colors, which are the same in both themes. */
const ALLOWED_FILES = new Set(['features/transactions/view-model.ts']);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('component sources use theme tokens', () => {
  const files = sourceFiles(SOURCE_ROOT)
    .map((path) => relative(SOURCE_ROOT, path))
    .filter((path) => !ALLOWED_FILES.has(path));

  test.each(files)('%s has no raw colors', (path) => {
    const source = readFileSync(join(SOURCE_ROOT, path), 'utf8');
    const violations = RAW_COLOR_PATTERNS.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
    expect(violations).toEqual([]);
  });
});
