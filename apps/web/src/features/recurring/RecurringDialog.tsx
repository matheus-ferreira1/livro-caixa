import { lastDayOfMonth, monthLabel, pad2, type Category, type MonthKey } from '@livro-caixa/domain';
import { CalendarCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCategories } from '@/features/settings/api';
import { TYPE_META } from '@/features/transactions/view-model';
import { isUnauthorized } from '@/shared/api/query-client';
import { cn, pluralize } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogTitleBar } from '@/shared/ui/dialog';
import { useGenerateRecurring, useRecurringCandidates } from './api';
import {
  generateRequest,
  recurringRows,
  recurringSummary,
  type RecurringDraft,
  type RecurringDrafts,
  type RecurringRow,
} from './view-model';

// Lançamento, Tipo, Data, Valor and Último lançado after the checkbox, as in the design.
const ROW_GRID = 'grid grid-cols-[36px_minmax(220px,1fr)_96px_168px_148px_150px] items-center gap-3 px-4';

const checkboxClass = 'size-[18px] border-input data-[state=checked]:border-ink data-[state=checked]:bg-ink';

interface RecurringDialogProps {
  month: MonthKey;
  open: boolean;
  onClose: () => void;
}

export function RecurringDialog({ month, open, onClose }: RecurringDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[1040px] overflow-hidden bg-card">
        <DialogTitleBar
          title="Gerar lançamentos recorrentes"
          description={`${monthLabel(month)} · a partir da última ocorrência de cada lançamento recorrente`}
        />
        {/* Remount on every open so the review starts from the suggestions again. */}
        {open && <RecurringReview month={month} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RecurringReview({ month, onClose }: Omit<RecurringDialogProps, 'open'>) {
  const { data: candidates } = useRecurringCandidates(month, true);
  const { data: categories = [] } = useCategories();
  const generate = useGenerateRecurring();
  // Untouched rows keep the suggested values, so the drafts only hold what was changed.
  const [drafts, setDrafts] = useState<RecurringDrafts>({});
  const [error, setError] = useState('');
  const categoryMap = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );

  if (!candidates) return null;
  const rows = recurringRows(candidates, drafts, categoryMap);
  const summary = recurringSummary(candidates, drafts);

  const updateRow = (row: RecurringRow, patch: Partial<RecurringDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [row.seriesId]: { include: row.include, date: row.date, value: row.value, ...patch },
    }));
    setError('');
  };
  const toggleAll = () => rows.forEach((row) => updateRow(row, { include: !summary.allSelected }));

  const submit = () => {
    const result = generateRequest(month, candidates, drafts);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    generate.mutate(result.request, {
      onSuccess: ({ transactions }) => {
        toast(`${pluralize(transactions.length, 'lançamento gerado', 'lançamentos gerados')} como previstos`);
        onClose();
      },
      onError: (err) => {
        if (!isUnauthorized(err)) setError(err.message);
      },
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-5">
        {rows.length ? (
          <>
            <p className="m-0 text-sm text-icon">
              Os lançamentos entram como <strong>previstos</strong>, sem observação. Ajuste datas e valores
              aqui ou depois, direto na lista. Desmarque o que não acontece neste mês.
            </p>
            <div className="overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <div className="min-w-[880px]">
                  <div
                    className={cn(
                      ROW_GRID,
                      'min-h-11 border-b bg-muted text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase',
                    )}
                  >
                    <Checkbox
                      aria-label="Selecionar todos"
                      checked={summary.allSelected}
                      onCheckedChange={toggleAll}
                      className={checkboxClass}
                    />
                    <span>Lançamento</span>
                    <span>Tipo</span>
                    <span>Data</span>
                    <span className="text-right">Valor (R$)</span>
                    <span className="text-right">Último lançado</span>
                  </div>
                  {rows.map((row) => (
                    <ReviewRow
                      key={row.seriesId}
                      row={row}
                      month={month}
                      onChange={(patch) => updateRow(row, patch)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-5 py-12 text-center text-muted-foreground">
            <CalendarCheck className="size-7 text-income" aria-hidden="true" />
            <span className="text-base font-semibold text-ink">Tudo em dia</span>
            <span>Todos os lançamentos recorrentes já estão em {monthLabel(month)}.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t bg-muted px-6 py-4">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-sm">
            <span className="font-semibold">{summary.selectionLabel}</span>
            <span className="font-mono text-income">+ {summary.income}</span>
            <span className="font-mono text-expense">− {summary.expense}</span>
          </span>
          {error && (
            <span role="alert" className="text-sm font-semibold text-expense">
              {error}
            </span>
          )}
        </div>
        <div className="flex gap-2.5">
          <DialogClose className="min-h-11 rounded-[10px] border bg-card px-[18px] font-semibold text-ink hover:bg-accent">
            Cancelar
          </DialogClose>
          <button
            type="button"
            onClick={submit}
            disabled={!summary.canGenerate || generate.isPending}
            className="min-h-11 rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-neutral-swatch"
          >
            {summary.generateLabel}
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewRow({
  row,
  month,
  onChange,
}: {
  row: RecurringRow;
  month: MonthKey;
  onChange: (patch: Partial<RecurringDraft>) => void;
}) {
  const meta = TYPE_META[row.type];
  const inputClass = 'min-h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-ink';
  return (
    <div className={cn(ROW_GRID, 'min-h-[60px] border-b border-divider py-2', !row.include && 'opacity-50')}>
      <Checkbox
        aria-label={row.includeLabel}
        checked={row.include}
        onCheckedChange={(checked) => onChange({ include: checked === true })}
        className={checkboxClass}
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{row.description}</span>
        <span className="text-[13px] text-muted-foreground">{row.meta}</span>
      </span>
      <span
        className={cn(
          'justify-self-start rounded-full px-2.5 py-[3px] text-[13px] font-semibold',
          meta.bg,
          meta.text,
        )}
      >
        {row.typeLabel}
      </span>
      <input
        type="date"
        aria-label={row.dateLabel}
        value={row.date}
        min={`${month}-01`}
        max={`${month}-${pad2(lastDayOfMonth(month))}`}
        onChange={(e) => onChange({ date: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        inputMode="decimal"
        aria-label={row.valueLabel}
        value={row.value}
        onChange={(e) => onChange({ value: e.target.value })}
        className={cn(inputClass, 'text-right font-mono font-medium')}
      />
      <span className="text-right font-mono text-[13px] text-muted-foreground">{row.lastLabel}</span>
    </div>
  );
}
