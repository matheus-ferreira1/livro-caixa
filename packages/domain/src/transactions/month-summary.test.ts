import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import { computeSettlement, monthTiles } from './month-summary';

const month = [
  aTransaction({ type: 'receita', valueCents: 850_000, confirmed: true, categoryId: 'c-salario' }),
  aTransaction({ type: 'receita', valueCents: 180_000, confirmed: false, categoryId: 'c-freela' }),
  aTransaction({ type: 'despesa', valueCents: 69_000, split: true, confirmed: true }),
  aTransaction({ type: 'despesa', valueCents: 18_640, split: true, confirmed: false }),
  aTransaction({ type: 'despesa', valueCents: 236_418, split: false, confirmed: true }),
  aTransaction({ type: 'despesa', valueCents: 41_200, split: false, confirmed: false }),
  aTransaction({ type: 'acerto', valueCents: 20_000, confirmed: true, categoryId: null }),
  aTransaction({ type: 'acerto', valueCents: 5_000, confirmed: false, categoryId: null }),
];

describe('computeSettlement', () => {
  test('splits confirmed and pending split expenses by the partner share', () => {
    const s = computeSettlement(month, 50, { includePending: true });
    expect(s.items).toHaveLength(2);
    expect(s.totalCents).toBe(87_640);
    expect(s.partnerCents).toBe(43_820);
    expect(s.mineCents).toBe(43_820);
    expect(s.receivedCents).toBe(20_000);
    expect(s.scheduledCents).toBe(5_000);
    expect(s.balanceCents).toBe(18_820);
  });

  test('can leave pending expenses out', () => {
    expect(computeSettlement(month, 50, { includePending: false }).totalCents).toBe(69_000);
  });

  test('clamps the share and never goes below zero', () => {
    expect(computeSettlement(month, 150, { includePending: true }).partnerCents).toBe(87_640);
    expect(computeSettlement(month, 0, { includePending: true }).balanceCents).toBe(0);
  });

  test('rounds the partner share to the cent', () => {
    const odd = [aTransaction({ valueCents: 1_001, split: true })];
    expect(computeSettlement(odd, 50, { includePending: true }).partnerCents).toBe(501);
  });
});

describe('monthTiles', () => {
  test('computes the four month tiles', () => {
    const tiles = monthTiles(month, 50);
    expect(tiles.incomeConfirmedCents).toBe(850_000);
    expect(tiles.incomeAllCents).toBe(1_030_000);
    expect(tiles.expenseConfirmedCents).toBe(305_418);
    expect(tiles.expenseAllCents).toBe(365_258);
    expect(tiles.settlementPendingCents).toBe(23_820);
    expect(tiles.settlementReceivedCents).toBe(20_000);
    // 850000 + 20000 - 305418
    expect(tiles.balanceCents).toBe(564_582);
    // 1030000 + max(43820, 25000) - 365258
    expect(tiles.projectedBalanceCents).toBe(708_562);
  });

  test('an empty month is all zeros', () => {
    expect(Object.values(monthTiles([], 50)).every((v) => v === 0)).toBe(true);
  });
});
