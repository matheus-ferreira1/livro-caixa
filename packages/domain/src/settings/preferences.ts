export const LANGUAGES = ['pt-BR', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Every currency here has two decimals, so integer cents stay valid for all of them. */
export const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_LANGUAGE: Language = 'pt-BR';
export const DEFAULT_CURRENCY: Currency = 'BRL';

/** What the login page needs before any session exists: nothing sensitive. */
export interface Preferences {
  language: Language;
  currency: Currency;
}

export const DEFAULT_PREFERENCES: Preferences = { language: DEFAULT_LANGUAGE, currency: DEFAULT_CURRENCY };
