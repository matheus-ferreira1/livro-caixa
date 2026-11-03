/** Money is always an integer number of cents (BRL). */
export type Cents = number;

export const MINUS = '−';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const MONEY_PATTERN = /^\d+(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:[.,]\d{1,2})?$/;

/**
 * Parses what people type in a pt-BR money field: "1.234,56", "180", "R$ 10,5", "10.5".
 * Returns null for anything that is not an amount.
 */
export function parseMoney(input: string): Cents | null {
  const raw = input.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!MONEY_PATTERN.test(raw)) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Like parseMoney for a field that also takes withdrawals: "-50,00" and "− 50,00" are negative. */
export function parseSignedMoney(input: string): Cents | null {
  const raw = input.trim();
  const negative = raw.startsWith('-') || raw.startsWith(MINUS);
  const cents = parseMoney(negative || raw.startsWith('+') ? raw.slice(1) : raw);
  return cents !== null && negative && cents !== 0 ? -cents : cents;
}

export function formatMoney(cents: Cents): string {
  return BRL.format(cents / 100).replace('-', MINUS);
}

/** "+ R$ 10,00" / "− R$ 10,00", as in totals and group headers. */
export function formatSignedMoney(cents: Cents): string {
  return `${cents < 0 ? MINUS : '+'} ${formatMoney(Math.abs(cents))}`;
}

/** Short amount without the currency, for chart labels: "1,2 mil". */
export function formatCompactAmount(cents: Cents): string {
  return COMPACT.format(cents / 100).replace('-', MINUS);
}

/** A ratio as a pt-BR percentage: 0.125 gives "12,5%". */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: fractionDigits })
    .format(ratio)
    .replace('-', MINUS);
}

/** Value shown in an editable field: "1234,56". */
export function toMoneyInput(cents: Cents): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export const sumCents = (values: Cents[]): Cents => values.reduce((acc, v) => acc + v, 0);

export const percentOf = (cents: Cents, percent: number): Cents => Math.round((cents * percent) / 100);
