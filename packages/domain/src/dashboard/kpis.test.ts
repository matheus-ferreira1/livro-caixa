import { describe, expect, test } from 'bun:test';
import type { MonthSummary } from '../transactions/year-summary';
import { compareToAverage, dashboardKpis, type DashboardMonth } from './kpis';

const aMonth = (month: string, overrides: Partial<MonthSummary> = {}): DashboardMonth => ({
  month,
  incomeCents: 100_000,
  expenseCents: 60_000,
  settlementCents: 10_000,
  balanceCents: 50_000,
  hasData: true,
  isEmpty: false,
  hasPending: false,
  ...overrides,
});

const emptyMonth = (month: string) =>
  aMonth(month, {
    incomeCents: 0,
    expenseCents: 0,
    settlementCents: 0,
    balanceCents: 0,
    hasData: false,
    isEmpty: true,
  });

const kpisOf = (overrides: {
  current?: DashboardMonth;
  previous?: DashboardMonth;
  priorYear?: DashboardMonth[];
  yearToDate?: DashboardMonth[];
}) =>
  dashboardKpis({
    current: aMonth('2026-10'),
    previous: aMonth('2026-09'),
    priorYear: [aMonth('2026-09')],
    yearToDate: [aMonth('2026-10')],
    ...overrides,
  });

describe('compareToAverage', () => {
  test('has nothing to compare without a value or an average', () => {
    expect(compareToAverage(null, 100)).toEqual({ kind: 'none' });
    expect(compareToAverage(100, null)).toEqual({ kind: 'none' });
    expect(compareToAverage(100, 0)).toEqual({ kind: 'none' });
  });

  test('is near the average within 3%', () => {
    expect(compareToAverage(10_299, 10_000)).toEqual({ kind: 'near' });
    expect(compareToAverage(9_701, 10_000)).toEqual({ kind: 'near' });
  });

  test('reports the distance from 3% on', () => {
    expect(compareToAverage(10_300, 10_000)).toEqual({ kind: 'above', ratio: 0.03 });
    expect(compareToAverage(5_000, 10_000)).toEqual({ kind: 'below', ratio: 0.5 });
  });

  test('keeps above and below correct when the average is negative', () => {
    expect(compareToAverage(-5_000, -10_000)).toEqual({ kind: 'above', ratio: 0.5 });
    expect(compareToAverage(-15_000, -10_000)).toEqual({ kind: 'below', ratio: 0.5 });
  });
});

describe('dashboardKpis', () => {
  describe('balance', () => {
    test('compares with the previous month', () => {
      const { balance } = kpisOf({ previous: aMonth('2026-09', { balanceCents: 80_000 }) });
      expect(balance).toEqual({
        hasData: true,
        cents: 50_000,
        previousMonth: '2026-09',
        previousHasData: true,
        differenceCents: -30_000,
      });
    });

    test('flags a month without data', () => {
      const { balance } = kpisOf({ current: emptyMonth('2026-10'), previous: emptyMonth('2026-09') });
      expect(balance).toMatchObject({ hasData: false, previousHasData: false });
    });
  });

  describe('savings rate', () => {
    test('is the part of the income left, compared in points with the prior average', () => {
      const { savingsRate } = kpisOf({
        priorYear: [aMonth('2026-08', { balanceCents: 20_000 }), aMonth('2026-09', { balanceCents: 40_000 })],
      });
      expect(savingsRate.rate).toBe(0.5);
      expect(savingsRate.averageRate).toBeCloseTo(0.3);
      expect(savingsRate.differencePoints).toBeCloseTo(20);
    });

    test('is null without data or without income', () => {
      expect(kpisOf({ current: emptyMonth('2026-10') }).savingsRate.rate).toBeNull();
      const noIncome = aMonth('2026-10', { incomeCents: 0, balanceCents: -60_000 });
      expect(kpisOf({ current: noIncome }).savingsRate.rate).toBeNull();
    });

    test('skips months without data or income in the average', () => {
      const { savingsRate } = kpisOf({
        priorYear: [
          emptyMonth('2026-07'),
          aMonth('2026-08', { incomeCents: 0, balanceCents: -5_000 }),
          aMonth('2026-09', { balanceCents: 40_000 }),
        ],
      });
      expect(savingsRate.averageRate).toBe(0.4);
    });

    test('has no difference without an average', () => {
      const { savingsRate } = kpisOf({ priorYear: [emptyMonth('2026-09')] });
      expect(savingsRate).toEqual({ rate: 0.5, averageRate: null, differencePoints: null });
    });
  });

  describe('net spend', () => {
    test('is expenses minus acertos, compared with the prior average', () => {
      const { netSpend } = kpisOf({
        priorYear: [aMonth('2026-09', { expenseCents: 35_000, settlementCents: 10_000 })],
      });
      expect(netSpend).toEqual({ cents: 50_000, comparison: { kind: 'above', ratio: 1 } });
    });

    test('skips months without data in the average', () => {
      const { netSpend } = kpisOf({ priorYear: [emptyMonth('2026-08'), aMonth('2026-09')] });
      expect(netSpend.comparison).toEqual({ kind: 'near' });
    });

    test('has nothing to compare when the average is zero', () => {
      const { netSpend } = kpisOf({
        priorYear: [aMonth('2026-09', { expenseCents: 10_000, settlementCents: 10_000 })],
      });
      expect(netSpend.comparison).toEqual({ kind: 'none' });
    });

    test('is null without data', () => {
      expect(kpisOf({ current: emptyMonth('2026-10') }).netSpend.cents).toBeNull();
    });
  });

  describe('year to date', () => {
    test('sums and averages only the months with data', () => {
      const { yearToDate } = kpisOf({
        yearToDate: [
          aMonth('2026-01', { balanceCents: 30_000 }),
          emptyMonth('2026-02'),
          aMonth('2026-03', { balanceCents: -10_000 }),
        ],
      });
      expect(yearToDate).toEqual({ activeMonths: 2, cents: 20_000, averageCents: 10_000 });
    });

    test('is zero without months with data', () => {
      const { yearToDate } = kpisOf({ yearToDate: [emptyMonth('2026-01')] });
      expect(yearToDate).toEqual({ activeMonths: 0, cents: 0, averageCents: 0 });
    });
  });
});
