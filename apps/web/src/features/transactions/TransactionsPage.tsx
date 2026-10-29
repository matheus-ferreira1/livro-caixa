import {
  displayPartnerName,
  filterTransactions,
  formatMoney,
  formatSignedMoney,
  monthLabel,
  monthTiles,
  periodRange,
  shiftMonth,
  sortTransactions,
  defaultSortDirection,
  totalsOf,
  type Category,
  type ListMode,
  type Transaction,
} from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Segmented } from '@/shared/Segmented';
import {
  useCategories,
  useDeleteTransaction,
  useMonthTransactions,
  useSearchTransactions,
  useSettings,
  useToggleFlags,
} from './api';
import { AllFiltersCard } from './components/AllFiltersCard';
import { ListToolbar } from './components/ListToolbar';
import { Pager } from './components/Pager';
import { SummaryTiles, type TileSpec } from './components/SummaryTiles';
import { TransactionTable, type RowGroup } from './components/TransactionTable';
import { useListState } from './useListState';
import { pluralize, rowViewModel } from './view-model';

const MODE_OPTIONS = [
  ['month', 'Por mês'],
  ['all', 'Todos'],
] as const;

const PERIOD_NAMES = {
  all: 'Todo o período',
  year: 'Este ano',
  '12m': 'Últimos 12 meses',
  custom: 'Período personalizado',
} as const;

export function TransactionsPage() {
  const { state, update, today } = useListState();
  const isAll = state.mode === 'all';
  const { data: categories = [] } = useCategories();
  const { data: settings } = useSettings();
  const categoryMap = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );
  const partnerName = settings ? displayPartnerName(settings) : '';
  const toggle = useToggleFlags();
  const remove = useDeleteTransaction();

  const monthQuery = useMonthTransactions(state.month, !isAll);
  const range = periodRange(state.period, today, { from: state.from, to: state.to });
  const searchQuery = useSearchTransactions(
    {
      type: state.type,
      status: state.status,
      category: state.category,
      q: state.query.trim(),
      from: range.from,
      to: range.to,
      sort: state.sort,
      dir: state.dir,
      page: state.page,
      pageSize: state.pageSize,
    },
    isAll,
  );

  const monthTx = useMemo(() => monthQuery.data ?? [], [monthQuery.data]);
  const monthFiltered = useMemo(
    () =>
      sortTransactions(
        filterTransactions(monthTx, { type: state.type, status: state.status, query: state.query }),
        state.sort,
        state.dir,
      ),
    [monthTx, state.type, state.status, state.query, state.sort, state.dir],
  );

  const toRow = (t: Transaction) => rowViewModel(t, categoryMap, { withYear: isAll });
  const groups: RowGroup[] = isAll
    ? allModeGroups(searchQuery.data, state.sort, toRow, update)
    : [{ key: state.month, rows: monthFiltered.map(toRow) }];

  const tiles = isAll
    ? allModeTiles(searchQuery.data?.totals, searchQuery.data?.total ?? 0, PERIOD_NAMES[state.period])
    : monthModeTiles(monthTx, settings?.partnerShare ?? 0, partnerName);

  const changeMode = (mode: ListMode) =>
    update({ mode, sort: 'date', dir: defaultSortDirection('date', mode) });

  const emptyHint = isAll
    ? 'Nenhum lançamento corresponde aos filtros e ao período escolhidos.'
    : monthTx.length
      ? 'Nenhum lançamento corresponde aos filtros.'
      : 'Ainda não há lançamentos neste mês.';

  const footer: ReactNode = isAll ? (
    searchQuery.data && (
      <Pager
        {...searchQuery.data}
        pageSize={state.pageSize}
        onPage={(page) => update({ page }, { resetPage: false })}
        onPageSize={(pageSize) => update({ pageSize })}
      />
    )
  ) : (
    <MonthFooter shown={monthFiltered.length} total={monthTx.length} filtered={monthFiltered} />
  );

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="Modo de exibição"
            size="sm"
            value={state.mode}
            options={MODE_OPTIONS}
            onChange={changeMode}
            className="self-start"
          />
          {isAll ? (
            <h1 className="m-0 flex min-h-11 items-center text-[32px] font-bold tracking-[-0.02em]">
              Todos os lançamentos
            </h1>
          ) : (
            <div className="flex items-center gap-2">
              <MonthArrow label="Mês anterior" onClick={() => update({ month: shiftMonth(state.month, -1) })}>
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </MonthArrow>
              <h1 className="m-0 min-w-[248px] text-center text-[32px] font-bold tracking-[-0.02em]">
                {monthLabel(state.month)}
              </h1>
              <MonthArrow label="Próximo mês" onClick={() => update({ month: shiftMonth(state.month, 1) })}>
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </MonthArrow>
            </div>
          )}
        </div>
      </div>

      <SummaryTiles tiles={tiles} />

      <ListToolbar
        type={state.type}
        status={state.status}
        query={state.query}
        onChange={(patch) => update(patch)}
      />

      {isAll && (
        <AllFiltersCard
          period={state.period}
          from={state.from}
          to={state.to}
          category={state.category}
          categories={categories}
          onChange={(patch) => update(patch)}
        />
      )}

      <TransactionTable
        groups={groups}
        sort={{ key: state.sort, dir: state.dir, nextDir: (key) => nextSortDirection(state, key) }}
        onSort={(sort, dir) => update({ sort, dir })}
        onToggleConfirmed={(row) => toggle.mutate({ id: row.id, confirmed: !row.confirmed })}
        onToggleSplit={(row) => toggle.mutate({ id: row.id, split: !row.split })}
        onDelete={(row) => remove.mutate(row.id)}
        empty={
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center text-muted-foreground">
            <span className="text-base font-semibold text-ink">Nenhum lançamento encontrado</span>
            <span>{emptyHint}</span>
          </div>
        }
        footer={footer}
      />
    </div>
  );
}

function nextSortDirection(
  state: { sort: string; dir: 'asc' | 'desc'; mode: ListMode },
  key: 'date' | 'description' | 'value',
) {
  if (state.sort === key) return state.dir === 'asc' ? 'desc' : 'asc';
  return defaultSortDirection(key, state.mode);
}

function monthModeTiles(monthTx: Transaction[], share: number, partnerName: string): TileSpec[] {
  const t = monthTiles(monthTx, share);
  return [
    {
      label: 'Receitas',
      tone: 'income',
      value: formatMoney(t.incomeConfirmedCents),
      sub: `Previsto no mês: ${formatMoney(t.incomeAllCents)}`,
    },
    {
      label: 'Despesas',
      tone: 'expense',
      value: formatMoney(t.expenseConfirmedCents),
      sub: `Previsto no mês: ${formatMoney(t.expenseAllCents)}`,
    },
    {
      label: 'Acerto a receber',
      tone: 'settlement',
      value: formatMoney(t.settlementPendingCents),
      sub: `Recebido de ${partnerName}: ${formatMoney(t.settlementReceivedCents)}`,
    },
    {
      label: 'Saldo realizado',
      dark: true,
      negative: t.balanceCents < 0,
      value: formatMoney(t.balanceCents),
      sub: `Projetado no fim do mês: ${formatMoney(t.projectedBalanceCents)}`,
    },
  ];
}

function allModeTiles(totals = totalsOf([]), count: number, periodName: string): TileSpec[] {
  return [
    { label: 'Receitas filtradas', tone: 'income', value: formatMoney(totals.incomeCents), sub: periodName },
    {
      label: 'Despesas filtradas',
      tone: 'expense',
      value: formatMoney(totals.expenseCents),
      sub: periodName,
    },
    {
      label: 'Acertos filtrados',
      tone: 'settlement',
      value: formatMoney(totals.settlementCents),
      sub: periodName,
    },
    {
      label: 'Saldo dos resultados',
      dark: true,
      negative: totals.balanceCents < 0,
      value: formatMoney(totals.balanceCents),
      sub: pluralize(count, 'lançamento encontrado', 'lançamentos encontrados'),
    },
  ];
}

function allModeGroups(
  data: ReturnType<typeof useSearchTransactions>['data'],
  sort: string,
  toRow: (t: Transaction) => ReturnType<typeof rowViewModel>,
  update: ReturnType<typeof useListState>['update'],
): RowGroup[] {
  if (!data) return [];
  // Month headers only make sense while rows are in date order.
  if (sort !== 'date') return [{ key: 'all', rows: data.items.map(toRow) }];
  const byId = new Map(data.items.map((t) => [t.id, t]));
  return data.groups.map((g) => ({
    key: g.monthKey,
    header: {
      label: monthLabel(g.monthKey),
      countLabel: pluralize(g.count, 'lançamento', 'lançamentos'),
      netLabel: formatSignedMoney(g.netCents),
      negative: g.netCents < 0,
      onOpen: () => update({ mode: 'month', month: g.monthKey, sort: 'date', dir: 'asc' }),
    },
    rows: g.ids.flatMap((id) => {
      const t = byId.get(id);
      return t ? [toRow(t)] : [];
    }),
  }));
}

function MonthFooter({ shown, total, filtered }: { shown: number; total: number; filtered: Transaction[] }) {
  const totals = totalsOf(filtered);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted px-5 py-3.5 text-sm text-muted-foreground">
      <span>
        {shown} de {total} lançamentos
      </span>
      <span className="flex flex-wrap gap-5 font-mono">
        <span>
          Entradas{' '}
          <strong className="text-income">{formatMoney(totals.incomeCents + totals.settlementCents)}</strong>
        </span>
        <span>
          Saídas <strong className="text-expense">{formatMoney(totals.expenseCents)}</strong>
        </span>
      </span>
    </div>
  );
}

function MonthArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-[10px] border bg-card text-ink hover:bg-accent"
    >
      {children}
    </button>
  );
}
