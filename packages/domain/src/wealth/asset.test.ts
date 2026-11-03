import { describe, expect, test } from 'bun:test';
import { anAutoAsset, aManualAsset } from '../test/builders';
import { assetCost, assetValue, institutionsOf, valueAssets } from './asset';

describe('assetValue', () => {
  test('is quantity times price for an automatic asset, rounded to the cent', () => {
    // 0.0038961 × R$ 13.937,69 = R$ 54,30
    expect(assetValue(anAutoAsset({ quantityE8: 389_610, priceCents: 1_393_769 }))).toBe(5430);
  });

  test('is the typed value for a manual asset', () => {
    expect(assetValue(aManualAsset({ currentCents: 169_116 }))).toBe(169_116);
  });
});

describe('assetCost', () => {
  test('is quantity times average price for an automatic asset', () => {
    expect(assetCost(anAutoAsset({ quantityE8: 300_000_000, avgPriceCents: 1025 }))).toBe(3075);
  });

  test('is unknown for an automatic asset with no average price', () => {
    expect(assetCost(anAutoAsset({ avgPriceCents: null }))).toBeNull();
  });

  test('is the invested amount for a manual asset, which may be unknown', () => {
    expect(assetCost(aManualAsset({ investedCents: 98_080 }))).toBe(98_080);
    expect(assetCost(aManualAsset({ investedCents: null }))).toBeNull();
  });
});

describe('valueAssets', () => {
  test('adds value, cost, result and share of the portfolio', () => {
    const [first, second] = valueAssets([
      aManualAsset({ currentCents: 7500, investedCents: 5000 }),
      aManualAsset({ currentCents: 2500, investedCents: null }),
    ]);
    expect(first).toMatchObject({ valueCents: 7500, costCents: 5000, resultCents: 2500, share: 0.75 });
    expect(second).toMatchObject({ valueCents: 2500, costCents: null, resultCents: null, share: 0.25 });
  });

  test('gives a zero share when the portfolio is worth nothing', () => {
    const [only] = valueAssets([aManualAsset({ currentCents: 0, investedCents: 0 })]);
    expect(only?.share).toBe(0);
  });
});

describe('institutionsOf', () => {
  test('lists each institution once, in order of first use', () => {
    const assets = [
      aManualAsset({ institution: 'XP' }),
      aManualAsset({ institution: 'BB' }),
      aManualAsset({ institution: 'XP' }),
    ];
    expect(institutionsOf(assets)).toEqual(['XP', 'BB']);
  });
});
