import { describe, expect, test } from 'bun:test';
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

describe('splitExample', () => {
  test('splits a R$ 100,00 bill by the partner share', () => {
    expect(splitExample(35)).toEqual({ totalCents: 10_000, partnerCents: 3_500, mineCents: 6_500 });
  });
});
