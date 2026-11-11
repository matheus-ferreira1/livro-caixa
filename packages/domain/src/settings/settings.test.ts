import { describe, expect, test } from 'bun:test';
import { isCurrency, isLanguage } from './preferences';
import { settingsInputSchema, splitExample } from './settings';

describe('settingsInputSchema', () => {
  test('trims the partner name', () => {
    expect(settingsInputSchema.parse({ partnerName: ' Bia ', partnerShare: 40 })).toEqual({
      partnerName: 'Bia',
      partnerShare: 40,
    });
  });

  test.each([-5, 105, 42, 12.5])('rejects a share of %p', (partnerShare) => {
    expect(settingsInputSchema.safeParse({ partnerName: 'Bia', partnerShare }).success).toBe(false);
  });
});

describe('settingsInputSchema language and currency', () => {
  test('accepts each language and currency on its own', () => {
    expect(settingsInputSchema.parse({ language: 'en', currency: 'GBP' })).toEqual({
      language: 'en',
      currency: 'GBP',
    });
  });

  test.each([{ language: 'fr' }, { currency: 'JPY' }, { currency: 'brl' }])('rejects %p', (patch) => {
    expect(settingsInputSchema.safeParse(patch).success).toBe(false);
  });
});

describe('splitExample', () => {
  test('splits a R$ 100,00 bill by the partner share', () => {
    expect(splitExample(35)).toEqual({ totalCents: 10_000, partnerCents: 3_500, mineCents: 6_500 });
  });
});

describe('preference guards', () => {
  test('accept only the supported values', () => {
    expect(['pt-BR', 'en', 'fr', ''].map(isLanguage)).toEqual([true, true, false, false]);
    expect(['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'usd'].map(isCurrency)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});
