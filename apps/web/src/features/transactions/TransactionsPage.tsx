import {
  displayPartnerName,
  filterTransactions,
  monthLabel,
  monthTiles,
  periodRange,
  shiftMonth,
  sortTransactions,
  defaultSortDirection,
  draftFromTransaction,
  emptyDraft,
  monthOf,
  totalsOf,
  type Category,
  type ListMode,
  type Localization,
  type MessageKey,
  type Period,
  type Transaction,
} from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight, Plus, Repeat, Users } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { ArrowButton } from '@/shared/ArrowButton';
import { Segmented } from '@/shared/Segmented';
import { SummaryTiles, type TileSpec } from '@/shared/SummaryTiles';
import { RecurringBanner } from '@/features/recurring/RecurringBanner';
import { RecurringDialog } from '@/features/recurring/RecurringDialog';
import { useCategories, useSettings } from '@/features/settings/api';
import { SettlementDialog } from '@/features/settlement/SettlementDialog';
import { useDeleteTransaction, useMonthTransactions, useSearchTransactions, useToggleFlags } from './api';
import { AllFiltersCard } from './components/AllFiltersCard';
import { ListToolbar } from './components/ListToolbar';
import { Pager } from './components/Pager';
import { TransactionFormSheet, type FormTarget } from './components/TransactionFormSheet';
import { TransactionTable, type RowGroup } from './components/TransactionTable';
import { useListState } from './useListState';
import { rowViewModel } from './view-model';

const MODE_OPTIONS = [
  ['month', 'transactions.modeMonth'],
  ['all', 'transactions.modeAll'],
] as const;

const PERIOD_NAMES = {
  all: 'transactions.periodName.all',
  year: 'transactions.periodName.year',
  '12m': 'transactions.periodName.12m',
  custom: 'transactions.periodName.custom',
} as const satisfies Record<Period, MessageKey>;

type Words = Pick<Localization, 't' | 'money'>;

export function TransactionsPage() {
  const l10n = usePreferences();
  const { t } = l10n;
  const { state, update, today } = useListState();
  const isAll = state.mode === 'all';
  const { data: categories = [] } = useCategories();
  const { data: settings } = useSettings();
  const categoryMap = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );
  const partnerName = settings ? displayPartnerName(settings, t) : '';
  const toggle = useToggleFlags();
  const remove = useDeleteTransaction();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

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

  const toRow = (transaction: Transaction) =>
    rowViewModel(transaction, categoryMap, { withYear: isAll }, l10n);
  const groups: RowGroup[] = isAll
    ? allModeGroups(searchQuery.data, state.sort, toRow, update, l10n)
    : [{ key: state.month, rows: monthFiltered.map(toRow) }];

  const tiles = isAll
    ? allModeTiles(
        searchQuery.data?.totals,
        searchQuery.data?.total ?? 0,
        t(PERIOD_NAMES[state.period]),
        l10n,
      )
    : monthModeTiles(monthTx, settings?.partnerShare ?? 0, partnerName, l10n);

  const visibleById = new Map(
    (isAll ? (searchQuery.data?.items ?? []) : monthTx).map((transaction) => [transaction.id, transaction]),
  );
  const openNew = () => setFormTarget({ id: null, draft: emptyDraft(state.month, today, categories) });
  const openEdit = (id: string) => {
    const transaction = visibleById.get(id);
    if (transaction) setFormTarget({ id, draft: draftFromTransaction(transaction, l10n.money) });
  };

  const changeMode = (mode: ListMode) =>
    update({ mode, sort: 'date', dir: defaultSortDirection('date', mode) });

  const emptyHint = isAll
    ? t('transactions.emptyAll')
    : monthTx.length
      ? t('transactions.emptyFiltered')
      : t('transactions.emptyMonth');

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
    <MonthFooter shown={monthFiltered.length} total={monthTx.length} filtered={monthFiltered} l10n={l10n} />
  );

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Segmented
            label={t('transactions.modeLabel')}
            size="sm"
            value={state.mode}
            options={MODE_OPTIONS.map(([value, key]) => [value, t(key)] as const)}
            onChange={changeMode}
            className="self-start"
          />
          {isAll ? (
            <h1 className="m-0 flex min-h-11 items-center text-[32px] font-bold tracking-[-0.02em]">
              {t('transactions.allTitle')}
            </h1>
          ) : (
            <div className="flex items-center gap-2">
              <ArrowButton
                label={t('transactions.previousMonth')}
                onClick={() => update({ month: shiftMonth(state.month, -1) })}
              >
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </ArrowButton>
              <h1 className="m-0 min-w-0 text-center text-[clamp(24px,7vw,32px)] font-bold whitespace-nowrap sm:min-w-[248px] tracking-[-0.02em]">
                {monthLabel(state.month, t)}
              </h1>
              <ArrowButton
                label={t('transactions.nextMonth')}
                onClick={() => update({ month: shiftMonth(state.month, 1) })}
              >
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </ArrowButton>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5 max-sm:w-full">
          {!isAll && (
            <>
              <button
                type="button"
                onClick={() => setRecurringOpen(true)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-input bg-card px-3 font-semibold text-ink hover:bg-accent max-sm:flex-auto sm:px-[18px]"
              >
                <Repeat className="size-[18px]" aria-hidden="true" />
                {t('transactions.generateRecurring')}
              </button>
              <button
                type="button"
                onClick={() => setSettlementOpen(true)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-settlement bg-card px-3 font-semibold text-settlement hover:bg-settlement-bg max-sm:flex-auto sm:px-[18px]"
              >
                <Users className="size-[18px]" aria-hidden="true" />
                {t('transactions.generateSettlement')}
              </button>
            </>
          )}
          <NewEntryButton onClick={openNew} className="max-sm:flex-auto" />
        </div>
      </div>

      {!isAll && <RecurringBanner month={state.month} onReview={() => setRecurringOpen(true)} />}

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
        onEdit={(row) => openEdit(row.id)}
        empty={
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center text-muted-foreground">
            <span className="text-base font-semibold text-ink">{t('transactions.emptyTitle')}</span>
            <span>{emptyHint}</span>
            <NewEntryButton onClick={openNew} withIcon={false} />
          </div>
        }
        footer={footer}
      />

      <TransactionFormSheet
        target={formTarget}
        categories={categories}
        partnerName={partnerName}
        partnerShare={settings?.partnerShare ?? 0}
        onClose={() => setFormTarget(null)}
        onSaved={(transaction) => {
          setFormTarget(null);
          // Show the month the entry landed in, as the design does after saving.
          update({ month: monthOf(transaction.date) }, { resetPage: false });
        }}
      />

      <SettlementDialog month={state.month} open={settlementOpen} onClose={() => setSettlementOpen(false)} />
      <RecurringDialog month={state.month} open={recurringOpen} onClose={() => setRecurringOpen(false)} />
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

function monthModeTiles(
  monthTx: Transaction[],
  share: number,
  partnerName: string,
  { t, money }: Words,
): TileSpec[] {
  const tiles = monthTiles(monthTx, share);
  return [
    {
      label: t('transactions.tileIncome'),
      tone: 'income',
      value: money.format(tiles.incomeConfirmedCents),
      sub: t('transactions.tilePlanned', money.format(tiles.incomeAllCents)),
    },
    {
      label: t('transactions.tileExpense'),
      tone: 'expense',
      value: money.format(tiles.expenseConfirmedCents),
      sub: t('transactions.tilePlanned', money.format(tiles.expenseAllCents)),
    },
    {
      label: t('transactions.tileSettlement'),
      tone: 'settlement',
      value: money.format(tiles.settlementPendingCents),
      sub: t('transactions.tileReceivedFrom', partnerName, money.format(tiles.settlementReceivedCents)),
    },
    {
      label: t('transactions.tileBalance'),
      dark: true,
      negative: tiles.balanceCents < 0,
      value: money.format(tiles.balanceCents),
      sub: t('transactions.tileProjected', money.format(tiles.projectedBalanceCents)),
    },
  ];
}

function allModeTiles(
  totals = totalsOf([]),
  count: number,
  periodName: string,
  { t, money }: Words,
): TileSpec[] {
  return [
    {
      label: t('transactions.tileIncomeFiltered'),
      tone: 'income',
      value: money.format(totals.incomeCents),
      sub: periodName,
    },
    {
      label: t('transactions.tileExpenseFiltered'),
      tone: 'expense',
      value: money.format(totals.expenseCents),
      sub: periodName,
    },
    {
      label: t('transactions.tileSettlementFiltered'),
      tone: 'settlement',
      value: money.format(totals.settlementCents),
      sub: periodName,
    },
    {
      label: t('transactions.tileBalanceFiltered'),
      dark: true,
      negative: totals.balanceCents < 0,
      value: money.format(totals.balanceCents),
      sub: t('transactions.entriesFound', count),
    },
  ];
}

function allModeGroups(
  data: ReturnType<typeof useSearchTransactions>['data'],
  sort: string,
  toRow: (transaction: Transaction) => ReturnType<typeof rowViewModel>,
  update: ReturnType<typeof useListState>['update'],
  { t, money }: Words,
): RowGroup[] {
  if (!data) return [];
  // Month headers only make sense while rows are in date order.
  if (sort !== 'date') return [{ key: 'all', rows: data.items.map(toRow) }];
  const byId = new Map(data.items.map((transaction) => [transaction.id, transaction]));
  return data.groups.map((g) => ({
    key: g.monthKey,
    header: {
      label: monthLabel(g.monthKey, t),
      countLabel: t('transactions.entryCount', g.count),
      netLabel: money.formatSigned(g.netCents),
      negative: g.netCents < 0,
      onOpen: () => update({ mode: 'month', month: g.monthKey, sort: 'date', dir: 'asc' }),
    },
    rows: g.ids.flatMap((id) => {
      const transaction = byId.get(id);
      return transaction ? [toRow(transaction)] : [];
    }),
  }));
}

function MonthFooter({
  shown,
  total,
  filtered,
  l10n: { t, money },
}: {
  shown: number;
  total: number;
  filtered: Transaction[];
  l10n: Words;
}) {
  const totals = totalsOf(filtered);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted px-4 py-3.5 text-sm text-muted-foreground md:px-5">
      <span>{t('transactions.shownOfTotal', shown, total)}</span>
      <span className="flex flex-wrap gap-5 font-mono">
        <span>
          {t('transactions.inflow')}{' '}
          <strong className="text-income">{money.format(totals.incomeCents + totals.settlementCents)}</strong>
        </span>
        <span>
          {t('transactions.outflow')}{' '}
          <strong className="text-expense">{money.format(totals.expenseCents)}</strong>
        </span>
      </span>
    </div>
  );
}

function NewEntryButton({
  onClick,
  withIcon = true,
  className,
}: {
  onClick: () => void;
  withIcon?: boolean;
  className?: string;
}) {
  const { t } = usePreferences();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-ink px-[18px] font-semibold text-white hover:bg-ink/90',
        className,
      )}
    >
      {withIcon && <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />}
      {t('transactions.new')}
    </button>
  );
}
