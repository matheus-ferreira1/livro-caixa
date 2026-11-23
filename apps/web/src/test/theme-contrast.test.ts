import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const TEXT_CONTRAST = 4.5;
const NON_TEXT_CONTRAST = 3;
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

function tokensIn(selector: string): Record<string, string> {
  const block = new RegExp(`^${selector.replace('.', '\\.')} \\{([\\s\\S]*?)^\\}`, 'm').exec(css)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
}

const light = tokensIn(':root');
const themes = { light, dark: { ...light, ...tokensIn('.dark') } };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(foreground: string, background: string): number {
  const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

const TEXT_PAIRS: ReadonlyArray<[string, string]> = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['icon', 'card'],
  ['primary-foreground', 'primary'],
  ['on-strong', 'surface-strong'],
  ['on-dark-muted', 'surface-strong'],
  ['mint', 'surface-strong'],
  ['negative-on-dark', 'surface-strong'],
  ['on-accent', 'settlement'],
  ['on-accent', 'expense'],
  ['income', 'income-bg'],
  ['income', 'card'],
  ['expense', 'expense-bg'],
  ['expense', 'card'],
  ['expense', 'expense-row'],
  ['destructive', 'card'],
  ['settlement', 'settlement-bg'],
  ['settlement', 'card'],
  ['info-text', 'settlement-bg'],
  ['pending', 'pending-bg'],
  ['pending', 'card'],
];

const NON_TEXT_PAIRS: ReadonlyArray<[string, string]> = [
  ['ring', 'card'],
  ['ring', 'background'],
  ['chart-income', 'card'],
  ['accumulated', 'card'],
  ['deficit', 'card'],
];

test('the dark theme overrides the light tokens', () => {
  expect(themes.dark.background).toBe('#1b241f');
  expect(themes.dark['surface-strong']).toBe(light['surface-strong']);
});

test('the dark Despesas bar is a visible mark', () => {
  // The light value is the design's own and every bar also carries its amount in text.
  expect(contrast(themes.dark['chart-expense'] ?? '', themes.dark.card ?? '')).toBeGreaterThanOrEqual(
    NON_TEXT_CONTRAST,
  );
});

describe.each(Object.entries(themes))('%s theme', (_name, tokens) => {
  test.each(TEXT_PAIRS)('%s on %s is readable text', (foreground, background) => {
    expect(contrast(tokens[foreground] ?? '', tokens[background] ?? '')).toBeGreaterThanOrEqual(
      TEXT_CONTRAST,
    );
  });

  test.each(NON_TEXT_PAIRS)('%s on %s is a visible mark', (foreground, background) => {
    expect(contrast(tokens[foreground] ?? '', tokens[background] ?? '')).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST,
    );
  });
});
