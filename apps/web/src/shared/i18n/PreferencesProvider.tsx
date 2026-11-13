import {
  DEFAULT_LOCALIZATION,
  isCurrency,
  isLanguage,
  localization,
  translator,
  type Localization,
} from '@livro-caixa/domain';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { AlertBanner } from '@/shared/ui-kit';
import { fetchPreferences, PREFERENCES_KEY, PreferencesTimeoutError } from './preferences';

const PreferencesContext = createContext<Localization>(DEFAULT_LOCALIZATION);

/** One automatic retry for the initial load. */
const MAX_PREFERENCES_RETRIES = 1;

const ptBR = translator('pt-BR');
const en = translator('en');

/**
 * Gives the whole app the instance's language and currency. The app does not render until they
 * are known: a guessed currency would show the wrong symbol and read a typed `1.234` the wrong way.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  // A ref, not state: `refetch` runs in the same handler, before a state change would reach the options.
  const manualRetry = useRef(false);
  const { data, errorUpdateCount, refetch, isFetching } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: ({ signal }) => fetchPreferences(signal),
    staleTime: Infinity,
    // A click on the retry button is a single attempt, so the wait after it is not doubled. A stalled
    // request is not retried either: a second timeout would double a blank wait.
    retry: (failureCount, error) =>
      !manualRetry.current &&
      failureCount < MAX_PREFERENCES_RETRIES &&
      !(error instanceof PreferencesTimeoutError),
  });
  const [retried, setRetried] = useState(false);
  const value = useMemo(
    () =>
      data && isLanguage(data.language) && isCurrency(data.currency)
        ? localization(data.language, data.currency)
        : null,
    [data],
  );
  const language = data?.language;

  useEffect(() => {
    if (language) document.documentElement.lang = language;
  }, [language]);

  if (value) return <PreferencesContext value={value}>{children}</PreferencesContext>;
  // Not `isError`: a retry puts the query back to pending, which would remove the button (and its
  // focus) for as long as the retry runs.
  if (errorUpdateCount > 0)
    return (
      <PreferencesError
        retrying={isFetching}
        retried={retried}
        onRetry={() => {
          manualRetry.current = true;
          setRetried(true);
          // Cleared once the attempt settles, so a later failing fetch gets its automatic retry back.
          void refetch().finally(() => {
            manualRetry.current = false;
          });
        }}
      />
    );
  return null;
}

const bothLanguages = (
  key: 'preferences.loadFailed' | 'preferences.retrying' | 'preferences.stillFailing',
) => (
  <>
    <p lang="pt-BR" className="m-0">
      {ptBR(key)}
    </p>
    <p lang="en" className="m-0">
      {en(key)}
    </p>
  </>
);

/**
 * The language is unknown here, so the message is given in both, pt-BR first, each part marked with
 * its own language because `<html lang>` is not set yet. The button is `aria-disabled` while it
 * retries, not `disabled`, so it keeps the focus if the retry fails; the polite status tells what
 * the retry is doing, since the alert itself does not change.
 */
function PreferencesError({
  retrying,
  retried,
  onRetry,
}: {
  retrying: boolean;
  retried: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertBanner>
        <div className="flex flex-col gap-1 text-left">{bothLanguages('preferences.loadFailed')}</div>
      </AlertBanner>
      <Button
        type="button"
        aria-disabled={retrying}
        aria-busy={retrying}
        onClick={() => {
          if (!retrying) onRetry();
        }}
        className="h-11 rounded-[10px] px-[18px] text-base font-semibold aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:hover:bg-primary"
      >
        {retrying && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        <span lang="pt-BR">{ptBR('preferences.retry')}</span>
        {/* Read out as a pause between the two languages; the visible divider is not copy. */}
        <span className="sr-only">,</span>
        <span aria-hidden="true" className="h-4 w-px bg-current opacity-40" />
        <span lang="en">{en('preferences.retry')}</span>
      </Button>
      <div role="status" className="flex min-h-11 flex-col gap-1 text-sm text-muted-foreground">
        {retried && bothLanguages(retrying ? 'preferences.retrying' : 'preferences.stillFailing')}
      </div>
    </main>
  );
}

export const usePreferences = (): Localization => useContext(PreferencesContext);
