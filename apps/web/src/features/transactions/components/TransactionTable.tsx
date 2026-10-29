import type { SortDirection, SortKey } from '@livro-caixa/domain';
import { ArrowDown, ArrowUp, Check, Clock, Pencil, Repeat, Trash2, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import type { RowViewModel } from '../view-model';

/** Column template shared by the header and every row (design: 8 columns, min 1120px). */
const GRID =
  'grid grid-cols-[76px_minmax(220px,1fr)_170px_104px_100px_136px_140px_92px] items-center gap-3 px-5';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasRows = groups.some((g) => g.rows.length > 0);

  return (
    <section aria-label="Lista de lançamentos" className="overflow-hidden rounded-[14px] border bg-card">
      <div className="overflow-x-auto">
        <div className="min-w-[1120px]">
          <div
            className={cn(
              GRID,
              'min-h-11 border-b bg-muted text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase',
            )}
          >
            <SortButton label="Data" column="date" sort={sort} onSort={onSort} />
            <SortButton label="Descrição" column="description" sort={sort} onSort={onSort} />
            <span>Categoria</span>
            <span>Tipo</span>
            <span>Dividido</span>
            <span>Status</span>
            <SortButton label="Valor" column="value" sort={sort} onSort={onSort} alignEnd />
            <span className="text-right">Ações</span>
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

const SORT_LABELS: Record<SortKey, string> = { date: 'data', description: 'descrição', value: 'valor' };

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
      aria-label={`Ordenar por ${SORT_LABELS[column]}, ${next === 'asc' ? 'crescente' : 'decrescente'}`}
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
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b bg-background px-5 py-2">
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
          aria-label={`Abrir ${label} na visão por mês`}
          className="min-h-8 rounded-lg border bg-card px-2.5 text-[13px] font-semibold text-settlement"
        >
          Abrir mês
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
  return (
    <div className={cn('border-b border-divider', deleting ? 'bg-expense-row' : 'bg-card')}>
      <div className={cn(GRID, 'min-h-16 py-3')}>
        <div className="flex flex-col">
          <span className="font-mono text-sm font-medium">{row.day}</span>
          <span className="text-xs text-muted-foreground">{row.weekday}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 font-semibold">
            {row.description}
            {row.recurring && (
              <Repeat
                role="img"
                aria-label="Recorrente"
                className="size-3.5 flex-none text-muted-foreground"
                strokeWidth={2.2}
              />
            )}
          </span>
          {row.note && <span className="text-[13px] text-muted-foreground">{row.note}</span>}
        </div>
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className="size-2.5 flex-none rounded-[3px]"
            style={{ background: row.categoryColor }}
          />
          {row.categoryName}
        </span>
        <span
          className={cn(
            'justify-self-start rounded-full px-2.5 py-[3px] text-[13px] font-semibold',
            row.typeText,
            row.typeBg,
          )}
        >
          {row.typeLabel}
        </span>
        <div>
          {row.canSplit ? (
            <button
              type="button"
              onClick={() => onToggleSplit(row)}
              aria-pressed={row.split}
              aria-label={`Conta dividida: ${row.split ? 'sim' : 'não'}`}
              className={cn(
                'flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold',
                row.split ? 'border-input bg-track text-ink' : 'border-border bg-card text-muted-foreground',
              )}
            >
              <Users className="size-[15px]" aria-hidden="true" />
              {row.split ? 'Sim' : 'Não'}
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleConfirmed(row)}
          aria-pressed={row.confirmed}
          aria-label={`${row.statusLabel}, clique para alternar`}
          className={cn(
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
        <span
          className={cn('text-right font-mono text-[15px] font-semibold whitespace-nowrap', row.typeText)}
        >
          {row.valueLabel}
        </span>
        <div className="flex justify-end gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row)}
              aria-label={`Editar ${row.description}`}
              className="flex size-10 items-center justify-center rounded-lg text-icon hover:bg-accent"
            >
              <Pencil className="size-[17px]" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`Excluir ${row.description}`}
            className="flex size-10 items-center justify-center rounded-lg text-expense hover:bg-expense-row"
          >
            <Trash2 className="size-[17px]" aria-hidden="true" />
          </button>
        </div>
      </div>
      {deleting && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 pb-3.5">
          <span className="text-sm font-semibold text-expense">
            Excluir “{row.description}”? Esta ação não pode ser desfeita.
          </span>
          <button
            type="button"
            onClick={onCancelDelete}
            className="min-h-9 rounded-lg border bg-card px-3.5 text-sm font-semibold text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="min-h-9 rounded-lg bg-expense px-3.5 text-sm font-semibold text-white"
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
