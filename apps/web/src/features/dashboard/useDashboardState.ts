import { isMonthKey, monthOf, todayIso, type MonthKey, type SummaryMode } from '@livro-caixa/domain';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

const DEFAULT_MODE: SummaryMode = 'real';

const currentMonth = (): MonthKey => monthOf(todayIso());

const parseMonth = (value: string | null): MonthKey => (value && isMonthKey(value) ? value : currentMonth());

const parseMode = (value: string | null): SummaryMode => (value === 'proj' ? 'proj' : DEFAULT_MODE);

/** Month and mode live in the URL, with defaults left out, so a month can be linked to and reloaded. */
export function useDashboardState() {
  const [params, setParams] = useSearchParams();
  const month = parseMonth(params.get('mes'));
  const mode = parseMode(params.get('modo'));

  const update = useCallback(
    (patch: { month?: MonthKey; mode?: SummaryMode }) => {
      setParams(
        (current) => {
          const nextMonth = patch.month ?? parseMonth(current.get('mes'));
          const nextMode = patch.mode ?? parseMode(current.get('modo'));
          const next = new URLSearchParams();
          if (nextMonth !== currentMonth()) next.set('mes', nextMonth);
          if (nextMode !== DEFAULT_MODE) next.set('modo', nextMode);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { month, mode, update };
}
