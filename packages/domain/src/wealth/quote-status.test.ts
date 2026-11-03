import { describe, expect, test } from 'bun:test';
import { aManualAsset, anAutoAsset } from '../test/builders';
import { quoteStatus, unavailableQuoteCount } from './quote-status';

const QUOTED_AT = 1_790_000_000_000;

describe('quoteStatus', () => {
  test('is updated when the last check found a quote', () => {
    expect(quoteStatus(anAutoAsset({ quotedAt: QUOTED_AT, quoteFailed: false }))).toEqual({
      kind: 'updated',
      quotedAt: QUOTED_AT,
    });
  });

  test('is unavailable, with no earlier quote, for an asset never quoted', () => {
    expect(quoteStatus(anAutoAsset({ quotedAt: null, quoteFailed: false }))).toEqual({
      kind: 'unavailable',
      quotedAt: null,
    });
  });

  test('is unavailable, keeping the earlier quote, when the last check failed', () => {
    expect(quoteStatus(anAutoAsset({ quotedAt: QUOTED_AT, quoteFailed: true }))).toEqual({
      kind: 'unavailable',
      quotedAt: QUOTED_AT,
    });
  });
});

describe('unavailableQuoteCount', () => {
  test('counts the automatic assets with no current quote', () => {
    const assets = [
      anAutoAsset({ quotedAt: QUOTED_AT }),
      anAutoAsset({ quotedAt: QUOTED_AT, quoteFailed: true }),
      anAutoAsset({ quotedAt: null }),
    ];
    expect(unavailableQuoteCount(assets)).toBe(2);
  });

  test('ignores manual assets', () => {
    expect(unavailableQuoteCount([aManualAsset()])).toBe(0);
  });
});
