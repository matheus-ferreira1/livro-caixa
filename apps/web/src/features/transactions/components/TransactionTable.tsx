import type { MessageKey, SortDirection, SortKey } from '@livro-caixa/domain';
import { ArrowDown, ArrowUp, Check, Clock, Pencil, Repeat, Trash2, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import type { RowViewModel } from '../view-model';

/**
 * Column template shared by the header and every row. From 768px it is the design's table of 8
 * columns (min 1120px). Below that there is no room for one, so each entry stacks into three lines:
 * description and value, date and category, then the toggles and actions.
 */
const GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 md:grid-cols-[76px_minmax(220px,1fr)_170px_104px_100px_136px_140px_92px] md:gap-3 md:px-5';

/** Where each cell sits in the stacked layout, as row / column / row end / column end. */
const STACKED = {
  description: '[grid-area:1/1/2/3] md:[grid-area:auto]',
  value: '[grid-area:1/3/2/4] md:[grid-area:auto]',
  date: '[grid-area:2/1/3/2] md:[grid-area:auto]',
  category: '[grid-area:2/2/3/4] md:[grid-area:auto]',
  toggles: '[grid-area:3/1/4/3] md:[grid-area:auto]',
  actions: '[grid-area:3/3/4/4] md:[grid-area:auto]',
};

/** Stretches a 36px pill's touch area to 44px while the entry is stacked. */
const TALLER_TOUCH_AREA = 'relative max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-1';

export interface RowGroup {
  key: string;
  header?: { label: string; countLabel: string; netLabel: string; negative: boolean; onOpen: () => void };
  rows: RowViewModel[];
}

export interface RowActions {
  onToggleConfirmed: (row: RowViewModel) => void;
  onToggleSplit: (row: RowViewModel) => void;
  onDelete: (row: RowViewModel) => void;
  onEdit?: (row: RowViewModel) => void;
}

interface TransactionTableProps extends RowActions {
  groups: RowGroup[];
  sort: { key: SortKey; dir: SortDirection; nextDir: (key: SortKey) => SortDirection };
  onSort: (key: SortKey, dir: SortDirection) => void;
  empty: ReactNode;
  footer: ReactNode;
}

export function TransactionTable({ groups, sort, onSort, empty, footer, ...actions }: TransactionTableProps) {
  const { t } = usePreferences();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasRows = groups.some((g) => g.rows.length > 0);

  return (
    <section
      aria-label={t('transactions.listLabel')}
      className="overflow-hidden rounded-[14px] border bg-card"
    >
      <div className="md:overflow-x-auto">
        <div className="md:min-w-[1120px]">
          <div
            className={cn(
              GRID,
              'min-h-11 border-b bg-muted text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase',
            )}
          >
            <SortButton label={t('transactions.columnDate')} column="date" sort={sort} onSort={onSort} />
            <SortButton
              label={t('transactions.columnDescription')}
              column="description"
              sort={sort}
              onSort={onSort}
            />
            <span className="hidden md:block">{t('transactions.columnCategory')}</span>
            <span className="hidden md:block">{t('transactions.columnType')}</span>
            <span className="hidden md:block">{t('transactions.columnSplit')}</span>
            <span className="hidden md:block">{t('transactions.columnStatus')}</span>
            <SortButton
              label={t('transactions.columnValue')}
              column="value"
              sort={sort}
              onSort={onSort}
              alignEnd
            />
            <span className="hidden text-right md:block">{t('transactions.columnActions')}</span>
          </div>
          {groups.map((group) => (
            <div key={group.key}>
              {group.header && <GroupHeader {...group.header} />}
              {group.rows.map((row) => (
                <TransactionRow
                  key={row.id}
                  row={row}
                  deleting={deletingId === row.id}
                  onAskDelete={() => setDeletingId(row.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  {...actions}
                />
              ))}
            </div>
          ))}
          {!hasRows && empty}
        </div>
      </div>
      {footer}
    </section>
  );
}

const SORT_LABELS = {
  date: 'transactions.sortDate',
  description: 'transactions.sortDescription',
  value: 'transactions.sortValue',
} as const satisfies Record<SortKey, MessageKey>;

function SortButton({
  label,
  column,
  sort,
  onSort,
  alignEnd,
}: {
  label: string;
  column: SortKey;
  sort: TransactionTableProps['sort'];
  onSort: TransactionTableProps['onSort'];
  alignEnd?: boolean;
}) {
  const { t } = usePreferences();
  const active = sort.key === column;
  const next = sort.nextDir(column);
  const arrow = active ? (
    sort.dir === 'asc' ? (
      <ArrowUp className="size-3" strokeWidth={2.8} aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3" strokeWidth={2.8} aria-hidden="true" />
    )
  ) : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column, next)}
      aria-label={t('transactions.sortBy', t(SORT_LABELS[column]), next === 'asc')}
      className={cn(
        'flex min-h-11 items-center gap-1 border-0 bg-transparent p-0 tracking-[inherit] uppercase',
        alignEnd ? 'justify-self-end' : 'justify-self-start',
        active ? 'text-ink' : 'text-muted-foreground',
      )}
    >
      {alignEnd && arrow}
      {label}
      {!alignEnd && arrow}
    </button>
  );
}

function GroupHeader({ label, countLabel, netLabel, negative, onOpen }: NonNullable<RowGroup['header']>) {
  const { t } = usePreferences();
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b bg-background px-4 py-2 md:px-5">
      <span className="flex items-baseline gap-2.5">
        <span className="font-bold">{label}</span>
        <span className="text-[13px] text-muted-foreground">{countLabel}</span>
      </span>
      <span className="flex items-center gap-3">
        <span
          className={cn('font-mono text-[13px] font-semibold', negative ? 'text-expense' : 'text-income')}
        >
          {netLabel}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('transactions.openMonthLabel', label)}
          className="min-h-11 rounded-lg border bg-card px-2.5 text-[13px] font-semibold text-settlement md:min-h-8"
        >
          {t('transactions.openMonth')}
        </button>
      </span>
    </div>
  );
}

interface TransactionRowProps extends RowActions {
  row: RowViewModel;
  deleting: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
}

function TransactionRow({
  row,
  deleting,
  onAskDelete,
  onCancelDelete,
  onToggleConfirmed,
  onToggleSplit,
  onDelete,
  onEdit,
}: TransactionRowProps) {
  const { t } = usePreferences();
  return (
    <div className={cn('border-b border-divider', deleting ? 'bg-expense-row' : 'bg-card')}>
      <div className={cn(GRID, 'min-h-16 gap-y-0.5 pt-3 pb-2 md:py-3')}>
        <div
          className={cn(STACKED.date, 'flex items-baseline gap-1.5 md:flex-col md:items-stretch md:gap-0')}
        >
          <span className="font-mono text-[13px] font-medium md:text-sm">{row.day}</span>
          <span className="text-xs text-muted-foreground">{row.weekday}</span>
        </div>
        <div className={cn(STACKED.description, 'flex min-w-0 flex-col gap-0.5')}>
          <span className="flex items-center gap-1.5 font-semibold">
            {row.description}
            {row.recurring && (
              <Repeat
                role="img"
                aria-label={t('transactions.recurringIcon')}
                className="size-3.5 flex-none text-muted-foreground"
                strokeWidth={2.2}
              />
            )}
          </span>
          {row.note && <span className="text-[13px] text-muted-foreground">{row.note}</span>}
        </div>
        <span className={cn(STACKED.category, 'flex min-w-0 items-center gap-2 text-[13px] md:text-sm')}>
          <span
            aria-hidden="true"
            className="size-2.5 flex-none rounded-[3px]"
            style={{ background: row.categoryColor }}
          />
          {row.categoryName}
        </span>
        <span
          className={cn(
            // Stacked, the value's sign and color already tell the type.
            'hidden justify-self-start rounded-full px-2.5 py-[3px] text-[13px] font-semibold md:block',
            row.typeText,
            row.typeBg,
          )}
        >
          {row.typeLabel}
        </span>
        <div className={cn(STACKED.toggles, 'flex items-center gap-2 max-md:mt-1.5 md:contents')}>
          <div className={cn(!row.canSplit && 'hidden md:block')}>
            {row.canSplit ? (
              <button
                type="button"
                onClick={() => onToggleSplit(row)}
                aria-pressed={row.split}
                aria-label={t('transactions.splitToggle', row.split)}
                className={cn(
                  TALLER_TOUCH_AREA,
                  'flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold',
                  row.split
                    ? 'border-input bg-track text-ink'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                <Users className="size-[15px]" aria-hidden="true" />
                {row.split ? t('transactions.yes') : t('transactions.no')}
              </button>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onToggleConfirmed(row)}
            aria-pressed={row.confirmed}
            aria-label={t('transactions.statusToggle', row.statusLabel)}
            className={cn(
              TALLER_TOUCH_AREA,
              'flex min-h-9 items-center gap-1.5 justify-self-start rounded-full border px-3 text-[13px] font-semibold',
              row.confirmed
                ? 'border-income-border bg-income-bg text-income'
                : 'border-dashed border-pending-border bg-pending-bg text-pending',
            )}
          >
            {row.confirmed ? (
              <Check className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
            ) : (
              <Clock className="size-[15px]" aria-hidden="true" />
            )}
            {row.statusLabel}
          </button>
        </div>
        <span
          className={cn(
            STACKED.value,
            'self-start text-right font-mono text-[15px] font-semibold whitespace-nowrap md:self-auto',
            row.typeText,
          )}
        >
          {row.valueLabel}
        </span>
        <div className={cn(STACKED.actions, 'flex justify-end gap-1 max-md:mt-1.5')}>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row)}
              aria-label={t('transactions.edit', row.description)}
              className="flex size-11 items-center justify-center rounded-lg text-icon hover:bg-accent md:size-10"
            >
              <Pencil className="size-[17px]" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={t('transactions.delete', row.description)}
            className="flex size-11 items-center justify-center rounded-lg text-expense hover:bg-expense-row md:size-10"
          >
            <Trash2 className="size-[17px]" aria-hidden="true" />
          </button>
        </div>
      </div>
      {deleting && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-4 pb-3.5 md:px-5">
          <span className="text-sm font-semibold text-expense">
            {t('transactions.confirmDelete', row.description)}
          </span>
          <button
            type="button"
            onClick={onCancelDelete}
            className="min-h-11 rounded-lg border bg-card px-3.5 text-sm font-semibold text-ink md:min-h-9"
          >
            {t('transactions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="min-h-11 rounded-lg bg-expense px-3.5 text-sm font-semibold text-white md:min-h-9"
          >
            {t('transactions.deleteConfirm')}
          </button>
        </div>
      )}
    </div>
  );
}
