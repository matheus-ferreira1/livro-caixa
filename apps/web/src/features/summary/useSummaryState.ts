import { todayIso, type SummaryMode } from '@livro-caixa/domain';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

const DEFAULT_MODE: SummaryMode = 'real';
const YEAR_PATTERN = /^\d{4}$/;

const currentYear = (): number => Number(todayIso().slice(0, 4));

const parseYear = (value: string | null): number =>
  value && YEAR_PATTERN.test(value) ? Number(value) : currentYear();

const parseMode = (value: string | null): SummaryMode => (value === 'proj' ? 'proj' : DEFAULT_MODE);

/** Year and mode live in the URL, with defaults left out, so a year can be linked to and reloaded. */
export function useSummaryState() {
  const [params, setParams] = useSearchParams();
  const year = parseYear(params.get('ano'));
  const mode = parseMode(params.get('modo'));

  const update = useCallback(
    (patch: { year?: number; mode?: SummaryMode }) => {
      setParams(
        (current) => {
          const nextYear = patch.year ?? parseYear(current.get('ano'));
          const nextMode = patch.mode ?? parseMode(current.get('modo'));
          const next = new URLSearchParams();
          if (nextYear !== currentYear()) next.set('ano', String(nextYear));
          if (nextMode !== DEFAULT_MODE) next.set('modo', nextMode);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { year, mode, update };
}
