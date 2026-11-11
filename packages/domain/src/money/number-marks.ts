import type { Currency } from '../settings/preferences';

/** The number locale each currency fixes, so one decimal mark shows on screen at a time. */
export const CURRENCY_LOCALES: Record<Currency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export interface NumberMarks {
  locale: string;
  decimal: ',' | '.';
}

const DECIMAL_COMMA_LOCALES = new Set(['pt-BR', 'de-DE']);

export function numberMarks(currency: Currency): NumberMarks {
  const locale = CURRENCY_LOCALES[currency];
  return { locale, decimal: DECIMAL_COMMA_LOCALES.has(locale) ? ',' : '.' };
}

export const groupMarkFor = (decimal: NumberMarks['decimal']): ',' | '.' => (decimal === ',' ? '.' : ',');
