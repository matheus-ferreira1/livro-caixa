import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import { monthSummary, summaryStatus, yearSummary, type YearSummaryMonth } from './year-summary';

const SHARE = 50;

const income = (date: string, valueCents: number, confirmed = true) =>
  aTransaction({ type: 'receita', date, valueCents, confirmed, categoryId: 'c-salario' });
const expense = (date: string, valueCents: number, overrides = {}) =>
  aTransaction({ type: 'despesa', date, valueCents, ...overrides });
const settlement = (date: string, valueCents: number, confirmed = true) =>
  aTransaction({ type: 'acerto', date, valueCents, confirmed, categoryId: null });

const monthOfYear = (months: YearSummaryMonth[], key: string) => {
  const found = months.find((m) => m.month === key);
  if (!found) throw new Error(`Month ${key} is missing`);
  return found;
};

describe('monthSummary', () => {
  const entries = [
    income('2026-03-05', 100_000),
    income('2026-03-06', 20_000, false),
    expense('2026-03-10', 40_000),
    expense('2026-03-11', 10_000, { confirmed: false }),
    settlement('2026-03-20', 5_000),
    settlement('2026-03-21', 2_000, false),
  ];

  test('"real" counts confirmed entries only', () => {
    expect(monthSummary(entries, 'real', SHARE)).toMatchObject({
      incomeCents: 100_000,
      expenseCents: 40_000,
      settlementCents: 5_000,
      balanceCents: 65_000,
    });
  });

  test('"proj" counts every entry', () => {
    expect(monthSummary(entries, 'proj', SHARE)).toMatchObject({
      incomeCents: 120_000,
      expenseCents: 50_000,
      settlementCents: 7_000,
      balanceCents: 77_000,
    });
  });

  test('"proj" raises the acerto to the expected partner share, previstos included', () => {
    const split = [
      expense('2026-03-10', 30_000, { split: true }),
      expense('2026-03-11', 10_000, { split: true, confirmed: false }),
      settlement('2026-03-20', 5_000),
    ];
    expect(monthSummary(split, 'proj', SHARE).settlementCents).toBe(20_000);
    expect(monthSummary(split, 'real', SHARE).settlementCents).toBe(5_000);
  });

  test('"proj" keeps an acerto larger than the expected partner share', () => {
    const split = [expense('2026-03-10', 10_000, { split: true }), settlement('2026-03-20', 9_000)];
    expect(monthSummary(split, 'proj', SHARE).settlementCents).toBe(9_000);
  });

  test('a month with only previstos has no data in "real" but is still pending', () => {
    const pending = [expense('2026-03-10', 10_000, { confirmed: false })];
    expect(monthSummary(pending, 'real', SHARE)).toMatchObject({
      hasData: false,
      isEmpty: false,
      hasPending: true,
      balanceCents: 0,
    });
    expect(monthSummary(pending, 'proj', SHARE)).toMatchObject({ hasData: true, hasPending: true });
  });
});

describe('summaryStatus', () => {
  test('a month without entries is empty', () => {
    expect(summaryStatus(monthSummary([], 'real', SHARE))).toBe('empty');
  });

  test('a month with a pending entry is open in both modes', () => {
    const pending = [expense('2026-03-10', 10_000, { confirmed: false })];
    expect(summaryStatus(monthSummary(pending, 'real', SHARE))).toBe('open');
    expect(summaryStatus(monthSummary(pending, 'proj', SHARE))).toBe('open');
  });

  test('a fully confirmed month is closed', () => {
    expect(summaryStatus(monthSummary([expense('2026-03-10', 10_000)], 'real', SHARE))).toBe('closed');
  });
});

describe('yearSummary', () => {
  test('returns the twelve months of the year in order, ignoring other years', () => {
    const summary = yearSummary(
      [income('2025-12-31', 1_000), income('2027-01-01', 2_000)],
      2026,
      'real',
      SHARE,
    );
    expect(summary.months.map((m) => m.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    expect(summary.totals.incomeCents).toBe(0);
  });

  test('summarizes a year with no entries', () => {
    const { months, totals } = yearSummary([], 2026, 'real', SHARE);
    expect(months.every((m) => m.isEmpty && m.accumulatedCents === null)).toBe(true);
    expect(totals).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      settlementCents: 0,
      balanceCents: 0,
      activeMonths: 0,
      averageExpenseCents: 0,
      averageBalanceCents: 0,
      bestMonth: null,
    });
  });

  test('the running total holds across empty months and stops after the last month with data', () => {
    const { months } = yearSummary(
      [income('2026-02-05', 10_000), income('2026-04-05', 5_000)],
      2026,
      'real',
      SHARE,
    );
    expect(monthOfYear(months, '2026-01').accumulatedCents).toBe(0);
    expect(monthOfYear(months, '2026-02').accumulatedCents).toBe(10_000);
    expect(monthOfYear(months, '2026-03').accumulatedCents).toBe(10_000);
    expect(monthOfYear(months, '2026-04').accumulatedCents).toBe(15_000);
    expect(monthOfYear(months, '2026-05').accumulatedCents).toBeNull();
  });

  test('a month with only previstos adds nothing to the "real" running total', () => {
    const { months } = yearSummary(
      [
        income('2026-01-05', 10_000),
        expense('2026-02-05', 3_000, { confirmed: false }),
        income('2026-03-05', 1_000),
      ],
      2026,
      'real',
      SHARE,
    );
    expect(monthOfYear(months, '2026-02').hasData).toBe(false);
    expect(monthOfYear(months, '2026-02').accumulatedCents).toBe(10_000);
    expect(monthOfYear(months, '2026-03').accumulatedCents).toBe(11_000);
  });

  test('totals add up the months and averages divide by the months with data', () => {
    const { totals } = yearSummary(
      [
        income('2026-01-05', 100_000),
        expense('2026-01-10', 40_000),
        settlement('2026-01-20', 1_000),
        expense('2026-06-10', 20_001),
      ],
      2026,
      'real',
      SHARE,
    );
    expect(totals).toMatchObject({
      incomeCents: 100_000,
      expenseCents: 60_001,
      settlementCents: 1_000,
      balanceCents: 40_999,
      activeMonths: 2,
      averageExpenseCents: 30_001,
      averageBalanceCents: 20_500,
    });
  });

  test('the best month is the highest balance, and the first one on a tie', () => {
    const { totals } = yearSummary(
      [income('2026-02-05', 5_000), income('2026-07-05', 9_000), income('2026-09-05', 9_000)],
      2026,
      'real',
      SHARE,
    );
    expect(totals.bestMonth).toEqual({ month: '2026-07', balanceCents: 9_000 });
  });

  test('the best month is still reported when every month is negative', () => {
    const { totals } = yearSummary(
      [expense('2026-02-05', 5_000), expense('2026-07-05', 2_000)],
      2026,
      'real',
      SHARE,
    );
    expect(totals.bestMonth).toEqual({ month: '2026-07', balanceCents: -2_000 });
  });

  test('a tiny negative average rounds to plain zero, never negative zero', () => {
    const { totals } = yearSummary(
      [expense('2026-01-05', 1), income('2026-02-05', 1), expense('2026-03-05', 1)],
      2026,
      'real',
      SHARE,
    );
    expect(totals.balanceCents).toBe(-1);
    expect(Object.is(totals.averageBalanceCents, 0)).toBe(true);
  });
});
