import { describe, expect, test } from 'bun:test';
import { anAutoAsset, aManualAsset, aSnapshot } from '../test/builders';
import { applyClosing, closingAvailable, closingDraft, closingRequestFrom } from './closing';

describe('closingAvailable', () => {
  const closedSeptember = [aSnapshot({ month: '2026-09' })];

  test.each([
    ['2026-10-24', false],
    ['2026-10-25', true],
    ['2026-10-31', true],
    ['2026-11-01', true],
    ['2027-02-10', true],
    ['2026-09-30', false],
  ])('after closing September, on %s it is %p', (today, expected) => {
    expect(closingAvailable(closedSeptember, 1, today)).toBe(expected);
  });

  test('opens at once for a portfolio with no closings', () => {
    expect(closingAvailable([], 1, '2026-11-03')).toBe(true);
  });

  test('stays shut while there is nothing to close', () => {
    expect(closingAvailable([], 0, '2026-11-25')).toBe(false);
  });

  test('still opens if every asset was removed after a closing', () => {
    expect(closingAvailable(closedSeptember, 0, '2026-10-25')).toBe(true);
  });
});

describe('closingDraft', () => {
  const xp = aManualAsset({ id: 'xp', institution: 'XP', name: 'Tesouro', currentCents: 10_000 });
  const bb = aManualAsset({ id: 'bb', institution: 'BB', name: 'Caução', currentCents: 5000 });
  const auto = anAutoAsset({ id: 'auto', quantityE8: 200_000_000, priceCents: 1000 });

  test('lists manual assets by institution and name, prefilled', () => {
    const draft = closingDraft([xp, auto, bb], {});
    expect(draft.rows.map((r) => r.asset.id)).toEqual(['bb', 'xp']);
    expect(draft.rows[0]).toMatchObject({ flowInput: '0,00', valueInput: '50,00', valid: true });
    expect(draft.autoAssets.map((a) => a.id)).toEqual(['auto']);
  });

  test('totals automatic values, typed values and flows', () => {
    const draft = closingDraft([xp, auto, bb], {
      xp: { value: '120,00', flow: '10,00' },
      bb: { flow: '−5,50' },
    });
    expect(draft.totalCents).toBe(2000 + 12_000 + 5000);
    expect(draft.contributionsCents).toBe(450);
  });

  test('marks unreadable input and leaves it out of the totals', () => {
    const draft = closingDraft([xp], { xp: { value: 'abc', flow: 'abc' } });
    expect(draft.rows[0]?.valid).toBe(false);
    expect(draft.totalCents).toBe(0);
    expect(draft.contributionsCents).toBe(0);
  });

  test('refuses a negative current value', () => {
    expect(closingDraft([xp], { xp: { value: '-1' } }).rows[0]?.valid).toBe(false);
  });
});

describe('closingRequestFrom', () => {
  const asset = aManualAsset({ id: 'xp', institution: 'XP', name: 'Tesouro', currentCents: 10_000 });

  test('names the first asset to review', () => {
    const draft = closingDraft([asset], { xp: { flow: 'abc' } });
    expect(closingRequestFrom(draft, '2026-10', '2026-11-03')).toEqual({
      error: 'Revise os valores de “Tesouro” (XP).',
    });
  });

  test('builds the request from valid rows', () => {
    const draft = closingDraft([asset], { xp: { flow: '-10,00', value: '90,00' } });
    expect(closingRequestFrom(draft, '2026-10', '2026-11-03')).toEqual({
      request: {
        month: '2026-10',
        today: '2026-11-03',
        items: [{ assetId: 'xp', flowCents: -1000, currentCents: 9000 }],
      },
    });
  });
});

describe('applyClosing', () => {
  test('records the total and flows, counting automatic assets at their value', () => {
    const { snapshot } = applyClosing(
      [aManualAsset({ id: 'm' }), anAutoAsset({ quantityE8: 100_000_000, priceCents: 700 })],
      {
        month: '2026-10',
        today: '2026-11-03',
        items: [{ assetId: 'm', flowCents: 300, currentCents: 2000 }],
      },
    );
    expect(snapshot).toEqual({ month: '2026-10', totalCents: 2700, contributionsCents: 300 });
  });

  test('moves the current value and adds the flow to the invested amount', () => {
    const { assets } = applyClosing([aManualAsset({ id: 'm', investedCents: 1000 })], {
      month: '2026-10',
      today: '2026-11-03',
      items: [{ assetId: 'm', flowCents: -300, currentCents: 2000 }],
    });
    expect(assets).toEqual([
      expect.objectContaining({ investedCents: 700, currentCents: 2000, updatedAt: '2026-11-03' }),
    ]);
  });

  test('stops the invested amount at zero when more is withdrawn than was invested', () => {
    const { assets, snapshot } = applyClosing([aManualAsset({ id: 'm', investedCents: 1000 })], {
      month: '2026-10',
      today: '2026-11-03',
      items: [{ assetId: 'm', flowCents: -1500, currentCents: 2000 }],
    });
    expect(assets[0]).toMatchObject({ investedCents: 0 });
    expect(snapshot.contributionsCents).toBe(-1500);
  });

  test('keeps an unknown invested amount unknown', () => {
    const { assets } = applyClosing([aManualAsset({ id: 'm', investedCents: null })], {
      month: '2026-10',
      today: '2026-11-03',
      items: [{ assetId: 'm', flowCents: 300, currentCents: 2000 }],
    });
    expect(assets[0]).toMatchObject({ investedCents: null });
  });

  test('changes only manual assets', () => {
    const { assets } = applyClosing([anAutoAsset()], { month: '2026-10', today: '2026-11-03', items: [] });
    expect(assets).toEqual([]);
  });
});
