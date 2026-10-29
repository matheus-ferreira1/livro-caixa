import {
  defaultSortDirection,
  isIsoDate,
  isMonthKey,
  monthOf,
  PAGE_SIZES,
  todayIso,
  type CategoryFilter,
  type ListMode,
  type MonthKey,
  type Period,
  type SortDirection,
  type SortKey,
  type StatusFilter,
  type TypeFilter,
} from '@livro-caixa/domain';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export interface ListState {
  mode: ListMode;
  month: MonthKey;
  type: TypeFilter;
  status: StatusFilter;
  query: string;
  period: Period;
  from: string;
  to: string;
  category: CategoryFilter;
  sort: SortKey;
  dir: SortDirection;
  page: number;
  pageSize: number;
}

const oneOf = <T extends string>(value: string | null, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

function parse(params: URLSearchParams, today: string): ListState {
  const mode = oneOf(params.get('modo'), ['month', 'all'] as const, 'month');
  const sort = oneOf(params.get('ordem'), ['date', 'description', 'value'] as const, 'date');
  const month = params.get('mes') ?? '';
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  const pageSize = Number(params.get('itens'));
  return {
    mode,
    month: isMonthKey(month) ? month : monthOf(today),
    type: oneOf(params.get('tipo'), ['all', 'receita', 'despesa', 'acerto'] as const, 'all'),
    status: oneOf(params.get('status'), ['all', 'confirmed', 'pending'] as const, 'all'),
    query: params.get('busca') ?? '',
    period: oneOf(params.get('periodo'), ['all', 'year', '12m', 'custom'] as const, 'all'),
    from: isIsoDate(from) ? from : '',
    to: isIsoDate(to) ? to : '',
    category: params.get('categoria') ?? 'all',
    sort,
    dir: oneOf(params.get('direcao'), ['asc', 'desc'] as const, defaultSortDirection(sort, mode)),
    page: Math.max(1, Number(params.get('pagina')) || 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : PAGE_SIZES[0],
  };
}

const URL_KEYS: Record<keyof ListState, string> = {
  mode: 'modo',
  month: 'mes',
  type: 'tipo',
  status: 'status',
  query: 'busca',
  period: 'periodo',
  from: 'de',
  to: 'ate',
  category: 'categoria',
  sort: 'ordem',
  dir: 'direcao',
  page: 'pagina',
  pageSize: 'itens',
};

/** List mode, month, filters, sort and page live in the URL so views can be shared and reloaded. */
export function useListState() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const state = useMemo(() => parse(params, today), [params, today]);

  const update = useCallback(
    (patch: Partial<ListState>, { resetPage = true } = {}) => {
      setParams(
        (current) => {
          const next = { ...parse(current, today), ...(resetPage ? { page: 1 } : {}), ...patch };
          const defaults = parse(new URLSearchParams(), today);
          const defaultDir = defaultSortDirection(next.sort, next.mode);
          const out = new URLSearchParams();
          for (const key of Object.keys(URL_KEYS) as (keyof ListState)[]) {
            const value = next[key];
            const isDefault = key === 'dir' ? value === defaultDir : value === defaults[key];
            if (!isDefault) out.set(URL_KEYS[key], String(value));
          }
          return out;
        },
        { replace: true },
      );
    },
    [setParams, today],
  );

  return { state, update, today };
}
