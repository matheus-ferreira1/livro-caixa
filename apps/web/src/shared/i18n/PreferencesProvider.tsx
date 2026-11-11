import {
  DEFAULT_LOCALIZATION,
  DEFAULT_PREFERENCES,
  localization,
  type Localization,
} from '@livro-caixa/domain';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { fetchPreferences, PREFERENCES_KEY } from './preferences';

const PreferencesContext = createContext<Localization>(DEFAULT_LOCALIZATION);

/**
 * Gives the whole app the instance's language and currency. Until they are known it uses the
 * defaults the instance shipped with, so a pt-BR + BRL instance never shows anything else.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: fetchPreferences,
    staleTime: Infinity,
    retry: 1,
  });
  const { language, currency } = data ?? DEFAULT_PREFERENCES;
  const value = useMemo(() => localization(language, currency), [language, currency]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export const usePreferences = (): Localization => useContext(PreferencesContext);
