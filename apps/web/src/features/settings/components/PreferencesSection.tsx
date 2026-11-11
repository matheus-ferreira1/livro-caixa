import {
  CURRENCIES,
  isCurrency,
  isLanguage,
  LANGUAGES,
  type Currency,
  type Language,
  type MessageKey,
} from '@livro-caixa/domain';
import { useId } from 'react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { useSaveSettings } from '../api';
import { settingsInputClass } from './CategoriesSection';

/** Each language is named in itself in both languages, so it can be found by someone who cannot read the current one. */
const LANGUAGE_NAMES: Record<Language, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };

const CURRENCY_LABELS: Record<Currency, MessageKey> = {
  BRL: 'settings.currencyBRL',
  USD: 'settings.currencyUSD',
  EUR: 'settings.currencyEUR',
  GBP: 'settings.currencyGBP',
};

/** Saves on its own, like the split section. The select shows what the app is using, so it never lags behind. */
export function PreferencesSection() {
  const { t, language, currency } = usePreferences();
  const languageId = useId();
  const currencyId = useId();
  const { mutate: save } = useSaveSettings();

  return (
    <section aria-labelledby="preferences-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="preferences-title" className="m-0 text-xl font-bold">
          {t('settings.preferencesTitle')}
        </h2>
        <p className="m-0 max-w-[640px] text-muted-foreground">{t('settings.preferencesIntro')}</p>
      </div>
      <div className="flex flex-wrap items-end gap-6 rounded-[14px] border bg-card p-5">
        <div className="flex flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor={languageId} className="text-sm font-semibold">
            {t('settings.language')}
          </label>
          <select
            id={languageId}
            value={language}
            onChange={(event) => isLanguage(event.target.value) && save({ language: event.target.value })}
            className={settingsInputClass}
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {LANGUAGE_NAMES[option]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor={currencyId} className="text-sm font-semibold">
            {t('settings.currency')}
          </label>
          <select
            id={currencyId}
            value={currency}
            onChange={(event) => isCurrency(event.target.value) && save({ currency: event.target.value })}
            className={settingsInputClass}
          >
            {CURRENCIES.map((option) => (
              <option key={option} value={option}>
                {t(CURRENCY_LABELS[option])}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
