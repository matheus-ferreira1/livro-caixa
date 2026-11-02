import { describe, expect, test } from 'bun:test';
import {
  dateParts,
  defaultDateForMonth,
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
