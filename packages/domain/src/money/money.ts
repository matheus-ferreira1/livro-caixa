import type { Currency, Language } from '../settings/preferences';
import { formatQuantity, parseQuantity, toQuantityInput } from '../wealth/quantity';
import { groupMarkFor, numberMarks, type NumberMarks } from './number-marks';

/** Money is always an integer number of cents, whatever the currency (all of them have two decimals). */
export type Cents = number;

export const MINUS = '−';

const CURRENCY_SYMBOLS: Record<Currency, string> = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };
const FRACTION_DIGITS = 2;
const CENTS_PER_UNIT = 100;

/** Everything that shows or reads an amount in one currency's number format. */
export interface MoneyFormat {
  currency: Currency;
  /** "R$", "$", "€" or "£": for field labels. */
  symbol: string;
  /** "R$ 1.234,56", "$1,234.56". */
  format(cents: Cents): string;
  /** "+ R$ 10,00" / "− R$ 10,00", as in totals and group headers. */
  formatSigned(cents: Cents): string;
  /** A ratio as a percentage in the currency's number format: 0.125 gives "12,5%" or "12.5%". */
  formatPercent(ratio: number, fractionDigits?: number): string;
  /** What people type in a money field; null for anything that is not an amount. */
  parse(input: string): Cents | null;
  /** Like `parse` for a field that also takes withdrawals: "-50,00" and "− 50,00" are negative. */
  parseSigned(input: string): Cents | null;
  /** Value shown in an editable field: "1234,56" or "1234.56". */
  toInput(cents: Cents): string;
  formatQuantity(quantityE8: number): string;
  parseQuantity(input: string): number | null;
  toQuantityInput(quantityE8: number): string;
}

const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function moneyPatterns({ decimal }: NumberMarks) {
  const group = escapeForRegExp(groupMarkFor(decimal));
  const mark = escapeForRegExp(decimal);
  return {
    // Either mark reads as the decimal point when at most two digits follow it.
    plain: /^\d+(?:[.,]\d{1,2})?$/,
    // The group mark only counts before three digits; the other mark is then the decimal point.
    grouped: new RegExp(`^[1-9]\\d{0,2}(?:${group}\\d{3})+(?:${mark}\\d{1,2})?$`),
  };
}

function moneyParser(currency: Currency): (input: string) => Cents | null {
  const marks = numberMarks(currency);
  const symbol = new RegExp(escapeForRegExp(CURRENCY_SYMBOLS[currency]), 'gi');
  const { plain, grouped } = moneyPatterns(marks);
  const groupMark = new RegExp(escapeForRegExp(groupMarkFor(marks.decimal)), 'g');
  return (input) => {
    const raw = input.replace(symbol, '').replace(/\s/g, '');
    const isPlain = plain.test(raw);
    if (!isPlain && !grouped.test(raw)) return null;
    const withoutGrouping = isPlain ? raw : raw.replace(groupMark, '');
    const [whole = '0', fraction = ''] = withoutGrouping.split(/[.,]/);
    return Number(whole) * CENTS_PER_UNIT + Number(fraction.padEnd(FRACTION_DIGITS, '0'));
  };
}

export function moneyFormat(currency: Currency): MoneyFormat {
  const { locale, decimal } = numberMarks(currency);
  const currencyFormatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const parse = moneyParser(currency);
  const format = (cents: Cents) => currencyFormatter.format(cents / CENTS_PER_UNIT).replace('-', MINUS);

  return {
    currency,
    symbol: CURRENCY_SYMBOLS[currency],
    format,
    formatSigned: (cents) => `${cents < 0 ? MINUS : '+'} ${format(Math.abs(cents))}`,
    formatPercent: (ratio, fractionDigits = 1) =>
      new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: fractionDigits })
        .format(ratio)
        .replace('-', MINUS),
    parse,
    parseSigned(input) {
      const raw = input.trim();
      const negative = raw.startsWith('-') || raw.startsWith(MINUS);
      const cents = parse(negative || raw.startsWith('+') ? raw.slice(1) : raw);
      return cents !== null && negative && cents !== 0 ? -cents : cents;
    },
    toInput: (cents) => (cents / CENTS_PER_UNIT).toFixed(FRACTION_DIGITS).replace('.', decimal),
    formatQuantity: (quantityE8) => formatQuantity(quantityE8, currency),
    parseQuantity: (input) => parseQuantity(input, currency),
    toQuantityInput: (quantityE8) => toQuantityInput(quantityE8, currency),
  };
}

/** The word in a compact amount follows the language ("1,2 mil", "1.2K"), so it is the one number that does. */
export function formatCompactAmount(cents: Cents, language: Language): string {
  return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
    .format(cents / CENTS_PER_UNIT)
    .replace('-', MINUS);
}

export const sumCents = (values: Cents[]): Cents => values.reduce((acc, v) => acc + v, 0);

export const percentOf = (cents: Cents, percent: number): Cents => Math.round((cents * percent) / 100);
