import { describe, expect, test } from 'bun:test';
import {
  dateParts,
  daysBetween,
  defaultDateForMonth,
  elapsedLabel,
  isIsoDate,
  lastDayOfMonth,
  monthLabel,
  monthName,
  monthShortName,
  shiftMonth,
} from './dates';

describe('month helpers', () => {
  test('names a month with or without abbreviating it', () => {
    expect(monthName('2026-03')).toBe('Março');
    expect(monthShortName('2026-03')).toBe('Mar');
    expect(monthShortName('2026-12')).toBe('Dez');
  });

  test('labels months in pt-BR', () => {
    expect(monthLabel('2026-10')).toBe('Outubro 2026');
    expect(monthLabel('2026-03')).toBe('Março 2026');
  });

  test('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', -11)).toBe('2025-11');
  });

  test('knows the last day of a month', () => {
    expect(lastDayOfMonth('2028-02')).toBe(29);
    expect(lastDayOfMonth('2026-11')).toBe(30);
  });
});

describe('dateParts', () => {
  test('splits a calendar date without timezone drift', () => {
    expect(dateParts('2026-10-01')).toEqual({ dd: '01', mm: '10', yy: '26', weekday: 'qui' });
    expect(dateParts('2026-11-01').weekday).toBe('dom');
  });
});

describe('defaultDateForMonth', () => {
  test('uses today when today is in the viewed month', () => {
    expect(defaultDateForMonth('2026-10', '2026-10-29')).toBe('2026-10-29');
  });

  test('uses the first day otherwise', () => {
    expect(defaultDateForMonth('2026-11', '2026-10-29')).toBe('2026-11-01');
  });
});

describe('daysBetween', () => {
  test('counts calendar days in either direction', () => {
    expect(daysBetween('2026-10-10', '2026-10-13')).toBe(3);
    expect(daysBetween('2026-10-10', '2026-10-09')).toBe(-1);
  });

  test('crosses a daylight-saving change as whole days', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });
});

describe('elapsedLabel', () => {
  const NOW = 1_790_000_000_000;
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  test.each([
    [0, 'agora'],
    [MINUTE - 1, 'agora'],
    [MINUTE, 'há 1 min'],
    [59 * MINUTE, 'há 59 min'],
    [HOUR, 'há 1 h'],
    [23 * HOUR + 59 * MINUTE, 'há 23 h'],
    [DAY, 'há 1 dia'],
    [3 * DAY, 'há 3 dias'],
  ])('reads %d ms ago as %s', (elapsed, label) => {
    expect(elapsedLabel(NOW - elapsed, NOW)).toBe(label);
  });

  test('reads a time ahead of a slow clock as now', () => {
    expect(elapsedLabel(NOW + HOUR, NOW)).toBe('agora');
  });
});

describe('isIsoDate', () => {
  test.each(['2026-11-06', '2026-01-31', '2028-02-29', '1900-01-01'])(
    'accepts the calendar date %p',
    (date) => {
      expect(isIsoDate(date)).toBe(true);
    },
  );

  test.each(['2026-02-31', '2027-02-29', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-5', 'hoje'])(
    'rejects %p, which is no day on the calendar',
    (date) => {
      expect(isIsoDate(date)).toBe(false);
    },
  );

  test.each(['1899-12-31', '0001-01-01', '0000-02-29'])('rejects %p, older than any ledger', (date) => {
    expect(isIsoDate(date)).toBe(false);
  });
});
