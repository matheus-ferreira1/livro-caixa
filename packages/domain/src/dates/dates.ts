import type { MessageKey, Translate } from '../i18n/translate';

/** Calendar dates are "YYYY-MM-DD" strings and months are "YYYY-MM"; no time zones involved. */
export type IsoDate = string;
export type MonthKey = string;

const MONTH_KEYS = [
  'month.1',
  'month.2',
  'month.3',
  'month.4',
  'month.5',
  'month.6',
  'month.7',
  'month.8',
  'month.9',
  'month.10',
  'month.11',
  'month.12',
] as const satisfies readonly MessageKey[];
const WEEKDAY_KEYS = [
  'weekday.0',
  'weekday.1',
  'weekday.2',
  'weekday.3',
  'weekday.4',
  'weekday.5',
  'weekday.6',
] as const satisfies readonly MessageKey[];
const MONTH_SHORT_NAME_LENGTH = 3;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export const pad2 = (n: number): string => String(n).padStart(2, '0');

function splitMonth(key: MonthKey): [number, number] {
  const [y, m] = key.split('-').map(Number);
  return [y ?? 0, m ?? 1];
}

export const monthOf = (date: IsoDate): MonthKey => date.slice(0, 7);

export function monthName(key: MonthKey, t: Translate): string {
  const [, m] = splitMonth(key);
  const messageKey = MONTH_KEYS[m - 1];
  return messageKey ? t(messageKey) : '';
}

export const monthShortName = (key: MonthKey, t: Translate): string =>
  monthName(key, t).slice(0, MONTH_SHORT_NAME_LENGTH);

export const monthLabel = (key: MonthKey, t: Translate): string =>
  `${monthName(key, t)} ${splitMonth(key)[0]}`;

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = splitMonth(key);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

export function lastDayOfMonth(key: MonthKey): number {
  const [y, m] = splitMonth(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dateParts(date: IsoDate, t: Translate) {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return {
    dd: pad2(d),
    mm: pad2(m),
    yy: String(y).slice(2),
    weekday: t(WEEKDAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? 'weekday.0'),
  };
}

/** Local calendar date of the browser or caller, never the server's UTC clock. */
export function todayIso(now = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Whole days from one date to another, counted on the calendar so no time zone shifts them. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const dayNumber = (date: IsoDate) => {
    const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / MS_PER_DAY;
  };
  return dayNumber(to) - dayNumber(from);
}

export const defaultDateForMonth = (key: MonthKey, today: IsoDate): IsoDate =>
  today.startsWith(key) ? today : `${key}-01`;

const ISO_DATE_PATTERN = /^((\d{4})-(?:0[1-9]|1[0-2]))-(\d{2})$/;
// No ledger goes back further, and Date.UTC reads the years 0 to 99 as 1900 to 1999.
const MIN_YEAR = 1900;

/** A day that exists on the calendar, so "2026-02-31" is refused and never lands in a month's totals. */
export function isIsoDate(value: string): boolean {
  const [, month, year, day] = ISO_DATE_PATTERN.exec(value) ?? [];
  if (!month || !year || !day || Number(year) < MIN_YEAR) return false;
  return Number(day) >= 1 && Number(day) <= lastDayOfMonth(month);
}
export const isMonthKey = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** How long ago an instant was, in epoch ms. `now` comes from the client, like every "today". */
export function elapsedLabel(from: number, now: number, t: Translate): string {
  const elapsed = now - from;
  if (elapsed < MS_PER_MINUTE) return t('elapsed.now');
  if (elapsed < MS_PER_HOUR) return t('elapsed.minutes', Math.floor(elapsed / MS_PER_MINUTE));
  if (elapsed < MS_PER_DAY) return t('elapsed.hours', Math.floor(elapsed / MS_PER_HOUR));
  return t('elapsed.days', Math.floor(elapsed / MS_PER_DAY));
}
