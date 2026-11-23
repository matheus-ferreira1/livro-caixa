import type { MessageKey } from '@livro-caixa/domain';
import { useId } from 'react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { isThemePreference, THEME_PREFERENCES, type ThemePreference } from '@/shared/theme/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { settingsInputClass } from './CategoriesSection';

const THEME_LABELS: Record<ThemePreference, MessageKey> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
};

/** Applies at once and stays on this device; nothing is sent to the server. */
export function AppearanceSection() {
  const { t } = usePreferences();
  const { preference, setPreference } = useTheme();
  const themeId = useId();

  return (
    <section aria-labelledby="appearance-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="appearance-title" className="m-0 text-xl font-bold">
          {t('settings.appearanceTitle')}
        </h2>
        <p className="m-0 max-w-[640px] text-muted-foreground">{t('settings.appearanceIntro')}</p>
      </div>
      <div className="flex flex-wrap items-end gap-6 rounded-[14px] border bg-card p-5">
        <div className="flex flex-[0_1_260px] flex-col gap-1.5">
          <label htmlFor={themeId} className="text-sm font-semibold">
            {t('settings.theme')}
          </label>
          <select
            id={themeId}
            value={preference}
            onChange={(event) => isThemePreference(event.target.value) && setPreference(event.target.value)}
            className={settingsInputClass}
          >
            {THEME_PREFERENCES.map((option) => (
              <option key={option} value={option}>
                {t(THEME_LABELS[option])}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
