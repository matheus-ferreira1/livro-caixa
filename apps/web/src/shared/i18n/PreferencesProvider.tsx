import { DEFAULT_LOCALIZATION, localization, translator, type Localization } from '@livro-caixa/domain';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { fetchPreferences, PREFERENCES_KEY } from './preferences';

const PreferencesContext = createContext<Localization>(DEFAULT_LOCALIZATION);

const ptBR = translator('pt-BR');
const en = translator('en');

/**
 * Gives the whole app the instance's language and currency. The app does not render until they
 * are known: a guessed currency would show the wrong symbol and read a typed `1.234` the wrong way.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: fetchPreferences,
    staleTime: Infinity,
    retry: 1,
  });
  const language = data?.language;
  const currency = data?.currency;
  const value = useMemo(
    () => (language && currency ? localization(language, currency) : null),
    [language, currency],
  );

  useEffect(() => {
    if (language) document.documentElement.lang = language;
  }, [language]);

  if (value) return <PreferencesContext value={value}>{children}</PreferencesContext>;
  if (isError) return <PreferencesError retrying={isFetching} onRetry={() => void refetch()} />;
  return null;
}

/** The language is unknown here, so the message is given in both, pt-BR first. */
function PreferencesError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <p className="text-ink">{ptBR('preferences.loadFailed')}</p>
      <p className="text-sm text-muted-foreground">{en('preferences.loadFailed')}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="min-h-11 rounded-[10px] bg-ink px-[18px] font-semibold text-white disabled:bg-icon"
      >
        {ptBR('preferences.retry')} / {en('preferences.retry')}
      </button>
    </div>
  );
}

export const usePreferences = (): Localization => useContext(PreferencesContext);
