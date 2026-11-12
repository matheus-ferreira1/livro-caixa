import { DEFAULT_LOCALIZATION, localization, translator, type Localization } from '@livro-caixa/domain';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { AlertBanner } from '@/shared/ui-kit';
import { fetchPreferences, PREFERENCES_KEY } from './preferences';

const PreferencesContext = createContext<Localization>(DEFAULT_LOCALIZATION);

const ptBR = translator('pt-BR');
const en = translator('en');

/**
 * Gives the whole app the instance's language and currency. The app does not render until they
 * are known: a guessed currency would show the wrong symbol and read a typed `1.234` the wrong way.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data, errorUpdateCount, refetch, isFetching } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: fetchPreferences,
    staleTime: Infinity,
    retry: 1,
  });
  const value = useMemo(() => (data ? localization(data.language, data.currency) : null), [data]);
  const language = data?.language;

  useEffect(() => {
    if (language) document.documentElement.lang = language;
  }, [language]);

  if (value) return <PreferencesContext value={value}>{children}</PreferencesContext>;
  // Not `isError`: a retry puts the query back to pending, which would remove the button (and its
  // focus) for as long as the retry runs.
  if (errorUpdateCount > 0) return <PreferencesError retrying={isFetching} onRetry={() => void refetch()} />;
  return null;
}

/**
 * The language is unknown here, so the message is given in both, pt-BR first, each part marked with
 * its own language because `<html lang>` is not set yet. The button is `aria-disabled` while it
 * retries, not `disabled`, so it keeps the focus if the retry fails.
 */
function PreferencesError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertBanner>
        <div className="flex flex-col gap-1 text-left">
          <p lang="pt-BR" className="m-0">
            {ptBR('preferences.loadFailed')}
          </p>
          <p lang="en" className="m-0 font-medium">
            {en('preferences.loadFailed')}
          </p>
        </div>
      </AlertBanner>
      <Button
        type="button"
        aria-disabled={retrying}
        onClick={() => {
          if (!retrying) onRetry();
        }}
        className="h-11 rounded-[10px] px-[18px] text-base font-semibold aria-disabled:cursor-default aria-disabled:opacity-50"
      >
        <span lang="pt-BR">{ptBR('preferences.retry')}</span>{' '}
        <span aria-hidden="true" className="h-4 w-px bg-current opacity-40" />{' '}
        <span lang="en">{en('preferences.retry')}</span>
      </Button>
    </main>
  );
}

export const usePreferences = (): Localization => useContext(PreferencesContext);
