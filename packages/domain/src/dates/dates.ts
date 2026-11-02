/** Calendar dates are "YYYY-MM-DD" strings and months are "YYYY-MM"; no time zones involved. */
export type IsoDate = string;
export type MonthKey = string;

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const MONTH_SHORT_NAME_LENGTH = 3;
const MS_PER_DAY = 86_400_000;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const pad2 = (n: number): string => String(n).padStart(2, '0');

function splitMonth(key: MonthKey): [number, number] {
  const [y, m] = key.split('-').map(Number);
  return [y ?? 0, m ?? 1];
}

export const monthOf = (date: IsoDate): MonthKey => date.slice(0, 7);

export function monthName(key: MonthKey): string {
  const [, m] = splitMonth(key);
  return MONTH_NAMES[m - 1] ?? '';
}

export const monthShortName = (key: MonthKey): string => monthName(key).slice(0, MONTH_SHORT_NAME_LENGTH);

export const monthLabel = (key: MonthKey): string => `${monthName(key)} ${splitMonth(key)[0]}`;

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = splitMonth(key);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

export function lastDayOfMonth(key: MonthKey): number {
  const [y, m] = splitMonth(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dateParts(date: IsoDate) {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return {
    dd: pad2(d),
    mm: pad2(m),
    yy: String(y).slice(2),
    weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '',
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

export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const isMonthKey = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
