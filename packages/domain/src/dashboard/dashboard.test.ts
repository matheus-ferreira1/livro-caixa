import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import type { PartnerSettings } from '../transactions/transaction';
import { buildDashboard, niceAxis, settlementCard } from './dashboard';

const SETTINGS: PartnerSettings = { partnerName: 'Bia', partnerShare: 50 };
const MONTH = '2026-10';

const income = (date: string, valueCents: number, overrides = {}) =>
  aTransaction({ type: 'receita', date, valueCents, categoryId: null, ...overrides });
const expense = (date: string, valueCents: number, overrides = {}) =>
  aTransaction({ type: 'despesa', date, valueCents, categoryId: null, ...overrides });
const settlement = (date: string, valueCents: number, confirmed = true) =>
  aTransaction({ type: 'acerto', date, valueCents, confirmed, categoryId: null });

const dashboardOf = (entries: ReturnType<typeof income>[], mode: 'real' | 'proj' = 'real') =>
  buildDashboard({ transactions: entries, categories: [], settings: SETTINGS, month: MONTH, mode });

describe('niceAxis', () => {
  test('rounds the step up to a nice value and covers the maximum', () => {
    expect(niceAxis(1_000_000).ticks).toEqual([0, 250_000, 500_000, 750_000, 1_000_000]);
    expect(niceAxis(1_100_000).ticks).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(niceAxis(1_100_000).topCents).toBe(1_500_000);
  });

  test('floors the maximum at R$ 4, so an empty period has whole-real ticks', () => {
    expect(niceAxis(0).ticks).toEqual([0, 100, 200, 300, 400]);
  });
});

describe('settlementCard', () => {
  const split = (valueCents: number, confirmed = true) =>
    expense(`${MONTH}-05`, valueCents, { split: true, confirmed });

  test('has nothing to settle without split bills', () => {
    expect(settlementCard([expense(`${MONTH}-05`, 1_000)], 50)).toEqual({
      status: 'none',
      pendingCents: 0,
      expectedCents: 0,
      receivedCents: 0,
      progress: 0,
      itemCount: 0,
      totalCents: 0,
    });
  });

  test('is pending with nothing received, previstos included', () => {
    expect(settlementCard([split(1_000), split(3_000, false)], 50)).toMatchObject({
      status: 'pending',
      pendingCents: 2_000,
      expectedCents: 2_000,
      itemCount: 2,
      totalCents: 4_000,
      progress: 0,
    });
  });

  test('does not subtract scheduled acertos from what is pending', () => {
    const entries = [split(4_000), settlement(`${MONTH}-28`, 2_000, false)];
    expect(settlementCard(entries, 50)).toMatchObject({ status: 'pending', pendingCents: 2_000 });
  });

  test('is partial with part of the amount received', () => {
    const entries = [split(4_000), settlement(`${MONTH}-28`, 500)];
    expect(settlementCard(entries, 50)).toMatchObject({
      status: 'partial',
      pendingCents: 1_500,
      receivedCents: 500,
      progress: 0.25,
    });
  });

  test('is settled once everything is received, capping the progress', () => {
    const entries = [split(4_000), settlement(`${MONTH}-28`, 3_000)];
    expect(settlementCard(entries, 50)).toMatchObject({ status: 'settled', pendingCents: 0, progress: 1 });
  });
});

describe('buildDashboard', () => {
  test('carries the month, the mode and the partner name', () => {
    expect(dashboardOf([], 'proj')).toMatchObject({ month: MONTH, mode: 'proj', partnerName: 'Bia' });
  });

  test('falls back to the default partner name', () => {
    const result = buildDashboard({
      transactions: [],
      categories: [],
      settings: { partnerName: ' ', partnerShare: 50 },
      month: MONTH,
      mode: 'real',
    });
    expect(result.partnerName).toBe('Companheira');
  });

  test('the series covers the 12 months ending at the viewed month', () => {
    const { series } = dashboardOf([income('2025-11-10', 100), income('2025-10-10', 900)]);
    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ month: '2025-11', incomeCents: 100, hasData: true });
    expect(series[11]?.month).toBe(MONTH);
  });

  test('averages use the 12 months before the viewed month and leave it out', () => {
    const { kpis } = dashboardOf([
      expense(`${MONTH}-05`, 90_000),
      expense('2026-09-05', 10_000),
      // 12 months back still counts, even though the bars stop one month later.
      expense('2025-10-05', 30_000),
      // 13 months back does not.
      expense('2025-09-05', 500_000),
    ]);
    // The average of 10_000 and 30_000 is 20_000, so 90_000 is 350% above it.
    expect(kpis.netSpend.comparison).toEqual({ kind: 'above', ratio: 3.5 });
  });

  test('the previous month is the one before the viewed month', () => {
    const { kpis } = dashboardOf([income(`${MONTH}-05`, 3_000), income('2026-09-05', 1_000)]);
    expect(kpis.balance).toMatchObject({ previousMonth: '2026-09', differenceCents: 2_000 });
  });

  test('year to date runs from January to the viewed month', () => {
    const { kpis } = dashboardOf([
      income('2025-12-05', 9_000),
      income('2026-01-05', 1_000),
      income(`${MONTH}-05`, 3_000),
      income('2026-11-05', 9_000),
    ]);
    expect(kpis.yearToDate).toEqual({ activeMonths: 2, cents: 4_000, averageCents: 2_000 });
  });

  test('the mode applies to KPIs, the series and the donut', () => {
    const entries = [expense(`${MONTH}-05`, 1_000, { confirmed: false })];
    const real = dashboardOf(entries, 'real');
    const proj = dashboardOf(entries, 'proj');
    expect(real.series[11]?.expenseCents).toBe(0);
    expect(real.categories.totalCents).toBe(0);
    expect(proj.series[11]?.expenseCents).toBe(1_000);
    expect(proj.categories.totalCents).toBe(1_000);
  });

  test('open items and the acerto card ignore the mode', () => {
    const entries = [expense(`${MONTH}-05`, 1_000, { confirmed: false, split: true })];
    const real = dashboardOf(entries, 'real');
    expect(real.open.count).toBe(1);
    expect(real.settlement).toMatchObject({ status: 'pending', expectedCents: 500 });
    expect(dashboardOf(entries, 'proj').open).toEqual(real.open);
  });
});
