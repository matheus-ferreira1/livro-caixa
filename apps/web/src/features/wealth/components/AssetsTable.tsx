import type { ValuedAsset } from '@livro-caixa/domain';
import { Pencil, Trash2 } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';
import { STACKED_CELL_LABEL } from '@/shared/stacked';
import { useDeleteAsset } from '../api';
import type { AssetGroupView, AssetRow, ValueTone } from '../view-model';
import { PricingTag } from './PricingTag';

const COLUMNS = 'minmax(200px,1.5fr) 96px 108px 108px 118px 118px 132px 112px';
const ACTIONS_COLUMN = '92px';
const DAILY_COLUMN = '72px';

/**
 * From 768px a row follows the table's columns, passed in `--columns`. Below that it stacks on a
 * grid of 6: name beside the current value and result, then the details in thirds, each under its
 * own label.
 */
const ROW_GRID = 'grid grid-cols-6 md:grid-cols-(--columns)';
const DETAIL_CELL = cn(STACKED_CELL_LABEL, 'col-span-2 md:col-auto md:text-right');

const TONE_TEXT: Record<ValueTone, string> = {
  good: 'text-income',
  bad: 'text-expense',
  neutral: 'text-muted-foreground',
};

interface AssetsTableProps {
  groups: AssetGroupView[];
  showDaily: boolean;
  hasUnavailableQuote: boolean;
  invested: string;
  total: string;
  onNew: () => void;
  onEdit: (asset: ValuedAsset) => void;
}

export function AssetsTable({
  groups,
  showDaily,
  hasUnavailableQuote,
  invested,
  total,
  onNew,
  onEdit,
}: AssetsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const remove = useDeleteAsset();
  const columns = {
    '--columns': showDaily ? `${COLUMNS} ${DAILY_COLUMN} ${ACTIONS_COLUMN}` : `${COLUMNS} ${ACTIONS_COLUMN}`,
  } as CSSProperties;

  return (
    <section aria-label="Ativos" className="overflow-hidden rounded-[14px] border bg-card">
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <p className="m-0 font-semibold">Nenhum ativo na carteira.</p>
          <button
            type="button"
            onClick={onNew}
            className="min-h-11 rounded-[10px] bg-ink px-[18px] font-semibold text-white"
          >
            Novo ativo
          </button>
        </div>
      ) : (
        <div className="md:overflow-x-auto">
          <div className={showDaily ? 'md:min-w-[1308px]' : 'md:min-w-[1218px]'}>
            <div
              className={cn(
                ROW_GRID,
                'min-h-11 items-center gap-3 border-b bg-muted px-5 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase max-md:hidden',
              )}
              style={columns}
            >
              <span>Ativo</span>
              <span className="text-right">Qtd.</span>
              <span className="text-right">Preço médio</span>
              <span className="text-right">Cotação</span>
              <span className="text-right">Aplicado</span>
              <span className="text-right">Atual</span>
              <span className="text-right">Resultado</span>
              <span>% carteira</span>
              {showDaily && <span className="text-right">Hoje</span>}
              <span className="text-right">Ações</span>
            </div>
            {groups.map((group) => (
              <div key={group.key}>
                <GroupHeader group={group} />
                {group.rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    color={group.color}
                    showDaily={showDaily}
                    columns={columns}
                    deleting={deletingId === row.id}
                    onEdit={() => onEdit(row.asset)}
                    onAskDelete={() => setDeletingId(row.id)}
                    onCancelDelete={() => setDeletingId(null)}
                    onDelete={() => {
                      remove.mutate({ id: row.id, name: row.name });
                      setDeletingId(null);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted px-4 py-3.5 text-sm text-muted-foreground md:px-5">
        <span className="flex flex-col gap-1">
          <span>
            Resultado = valor atual − valor aplicado. Aportes informados no fechamento entram no valor
            aplicado.
          </span>
          {hasUnavailableQuote && (
            <span>Sem cotação, o ativo usa o último preço salvo. Para atualizar, edite o ativo.</span>
          )}
        </span>
        <span className="flex flex-wrap gap-5 font-mono">
          <span>
            Aplicado <strong className="text-ink">{invested}</strong>
          </span>
          <span>
            Atual <strong className="text-ink">{total}</strong>
          </span>
        </span>
      </div>
    </section>
  );
}

function GroupHeader({ group }: { group: AssetGroupView }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b bg-background px-4 py-2 md:px-5">
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: group.color }} />
        <span className="font-bold">{group.name}</span>
        <span className="text-[13px] text-muted-foreground">{group.count}</span>
      </span>
      <span className="flex items-center gap-4 font-mono text-[13px] font-semibold">
        <span>{group.value}</span>
        <span className="text-muted-foreground">{group.percent}</span>
      </span>
    </div>
  );
}

function Row({
  row,
  color,
  showDaily,
  columns,
  deleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  row: AssetRow;
  color: string;
  showDaily: boolean;
  columns: CSSProperties;
  deleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  // Stacked, a manual asset has no quantity or prices to show, so that line goes.
  const unitCell = cn(DETAIL_CELL, row.asset.pricing === 'manual' && 'max-md:hidden');
  return (
    <div className={cn('border-b border-divider', deleting ? 'bg-expense-row' : 'bg-card')}>
      <div
        className={cn(
          ROW_GRID,
          'items-center gap-x-2 gap-y-2.5 px-4 pt-3 pb-1.5 font-mono text-[13px] md:min-h-[60px] md:gap-3 md:px-5 md:py-2.5 md:text-[13.5px]',
        )}
        style={columns}
      >
        <span className="flex min-w-0 flex-col gap-0.5 self-start font-sans [grid-area:1/1/3/4] md:self-auto md:[grid-area:auto]">
          <span className="text-[15px] font-semibold md:truncate">{row.name}</span>
          {/* The tag does not fit beside most institutions, and every row should break the same way. */}
          <span
            className={cn(
              'flex gap-1.5 text-[12.5px] text-muted-foreground',
              row.pricingTag.kind === 'unavailable' ? 'flex-col items-start' : 'flex-wrap items-center',
            )}
          >
            <span className="font-semibold text-icon">{row.subtitle}</span>
            {row.pricingTag.kind !== 'unavailable' && '·'}
            <PricingTag tag={row.pricingTag} />
          </span>
        </span>
        <span data-label="Qtd." className={unitCell}>
          {row.quantity}
        </span>
        <span data-label="Preço médio" className={unitCell}>
          {row.avgPrice}
        </span>
        <span data-label="Cotação" className={cn(unitCell, 'flex flex-col md:items-end')}>
          <span>{row.price}</span>
          {row.priceNote && <span className="text-xs text-muted-foreground">{row.priceNote}</span>}
        </span>
        <span data-label="Aplicado" className={cn(DETAIL_CELL, 'text-icon')}>
          {row.invested}
        </span>
        <span className="text-right text-[15px] font-semibold [grid-area:1/4/2/7] md:text-[length:inherit] md:[grid-area:auto]">
          {row.current}
        </span>
        <span
          className={cn(
            'flex flex-col items-end self-start [grid-area:2/4/3/7] md:self-auto md:[grid-area:auto]',
            TONE_TEXT[row.resultTone],
          )}
        >
          <span className="font-semibold">{row.result}</span>
          <span className="text-xs">{row.resultPercent}</span>
        </span>
        <span
          data-label="% carteira"
          className={cn(
            STACKED_CELL_LABEL,
            'col-span-2 flex min-w-0 flex-wrap items-center gap-x-2 max-md:before:basis-full md:col-auto md:flex-nowrap',
          )}
        >
          <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-divider">
            <span className="rounded-full" style={{ width: row.shareWidth, background: color }} />
          </span>
          <span className="min-w-11 text-right text-[12.5px]">{row.share}</span>
        </span>
        {showDaily && (
          <span
            data-label="Hoje"
            className={cn(DETAIL_CELL, 'text-[12.5px] font-semibold', TONE_TEXT[row.dayTone])}
          >
            {row.day}
          </span>
        )}
        <span className={cn('flex justify-end gap-1 md:col-auto', showDaily ? 'col-span-6' : 'col-span-2')}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${row.name}`}
            className="flex size-11 items-center justify-center rounded-lg text-icon hover:bg-accent"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`Remover ${row.name}`}
            className="flex size-11 items-center justify-center rounded-lg text-expense hover:bg-expense-row"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      {deleting && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-4 pb-3.5 md:px-5">
          <span className="text-sm font-semibold text-expense">Remover “{row.name}” da carteira?</span>
          <button
            type="button"
            onClick={onCancelDelete}
            className="min-h-11 rounded-lg border bg-card px-3.5 text-sm font-semibold text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 rounded-lg bg-expense px-3.5 text-sm font-semibold text-white"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
