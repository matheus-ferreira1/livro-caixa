import { moneyFormat, type MoneyFormat } from '../money/money';
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE, type Currency, type Language } from '../settings/preferences';
import { translator, type Translate } from './translate';

/** Everything a screen or a use case needs to write copy and amounts for one language and currency. */
export interface Localization {
  language: Language;
  currency: Currency;
  t: Translate;
  money: MoneyFormat;
}

export function localization(language: Language, currency: Currency): Localization {
  return { language, currency, t: translator(language), money: moneyFormat(currency) };
}

/** What an instance shows until its own settings are known: the language and currency it shipped with. */
export const DEFAULT_LOCALIZATION: Localization = localization(DEFAULT_LANGUAGE, DEFAULT_CURRENCY);
