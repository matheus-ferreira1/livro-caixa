import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SITE_ROOT = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(SITE_ROOT, 'src/styles.css'), 'utf8');
const html = readFileSync(resolve(SITE_ROOT, 'index.html'), 'utf8');

/** WCAG 2.2 minimums: 1.4.3 for text, 1.4.11 for the focus ring. */
const TEXT_CONTRAST = 4.5;
const NON_TEXT_CONTRAST = 3;

/** sRGB linearisation and luminance weights from the WCAG 2.2 relative luminance definition. */
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_WEIGHTS = { red: 0.2126, green: 0.7152, blue: 0.0722 };
const CONTRAST_FLARE = 0.05;

type Tokens = Record<string, string>;

function colorTokensIn(block: string): Tokens {
  // Only 6-digit hex is parsed, so any other notation must fail loudly rather than be skipped.
  for (const [declaration] of block.matchAll(/--color-[\w-]+:[^;]*;/g))
    expect(declaration, 'color tokens must be 6-digit hex').toMatch(/:\s*#[0-9a-f]{6}\s*;$/i);
  const tokens: Tokens = {};
  for (const [, name, value] of block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi))
    if (name && value) tokens[name] = value.toLowerCase();
  return tokens;
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`No "${marker}" in styles.css`);
  return css.slice(start, css.indexOf('}', start));
}

const light = colorTokensIn(blockAfter('@theme {'));
const dark: Tokens = { ...light, ...colorTokensIn(blockAfter('@media (prefers-color-scheme: dark)')) };

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= SRGB_LINEAR_THRESHOLD
      ? channel / SRGB_LINEAR_SLOPE
      : ((channel + SRGB_GAMMA_OFFSET) / (1 + SRGB_GAMMA_OFFSET)) ** SRGB_GAMMA,
  );
  return LUMINANCE_WEIGHTS.red * red + LUMINANCE_WEIGHTS.green * green + LUMINANCE_WEIGHTS.blue * blue;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + CONTRAST_FLARE) / ((darker ?? 0) + CONTRAST_FLARE);
}

/** Pairs the page actually draws: [text token, background token, minimum ratio]. */
const PAIRS: [string, string, number][] = [
  ...['paper', 'band', 'card'].flatMap((surface): [string, string, number][] => [
    ['ink', surface, TEXT_CONTRAST],
    ['muted', surface, TEXT_CONTRAST],
    ['settlement', surface, TEXT_CONTRAST],
    ['focus', surface, NON_TEXT_CONTRAST],
  ]),
  ['income', 'income-bg', TEXT_CONTRAST],
  ['expense', 'expense-bg', TEXT_CONTRAST],
  ['settlement', 'settlement-bg', TEXT_CONTRAST],
  ['info-text', 'settlement-bg', TEXT_CONTRAST],
  ['on-strong', 'surface-strong', TEXT_CONTRAST],
  ['on-dark-muted', 'surface-strong', TEXT_CONTRAST],
  ['mint', 'surface-strong', TEXT_CONTRAST],
  ['on-mint', 'mint', TEXT_CONTRAST],
];

describe('site color themes', () => {
  it.each([
    ['light', light],
    ['dark', dark],
  ])('meets the WCAG contrast minimums in the %s theme', (_, tokens) => {
    for (const [foreground, background, minimum] of PAIRS) {
      const [fg, bg] = [tokens[foreground], tokens[background]];
      expect(fg, foreground).toBeDefined();
      expect(bg, background).toBeDefined();
      expect(contrast(fg ?? '', bg ?? ''), `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('keeps the ink band, mint and the header colors the same in both themes', () => {
    for (const token of ['surface-strong', 'on-strong', 'on-mint', 'mint', 'on-dark-muted', 'header-active'])
      expect(dark[token], token).toBe(light[token]);
    expect(light['surface-strong']).toBe('#17201c');
  });

  it('lets the browser draw its own controls and scrollbars in either scheme', () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });

  it('uses theme tokens instead of fixed white, so nothing stays bright in dark mode', () => {
    expect(html).not.toMatch(/\b(text|bg|border)-white\b/);
    expect(css).not.toMatch(/background:\s*#fff\b/i);
  });

  it('paints dark surfaces with surface-strong, never with ink, which turns light in dark mode', () => {
    expect(html).not.toMatch(/\bbg-ink\b/);
    expect(html).not.toMatch(/\bbg-mint\b[^"]*\btext-ink\b|\btext-ink\b[^"]*\bbg-mint\b/);
    expect(css).not.toMatch(/background-color:\s*var\(--color-ink\)/);
  });
});
