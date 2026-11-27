import { lastDayOfMonth, monthLabel, pad2, type Category, type MonthKey } from '@livro-caixa/domain';
import { CalendarCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCategories } from '@/features/settings/api';
import { TYPE_META } from '@/features/transactions/view-model';
import { isUnauthorized } from '@/shared/api/query-client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { STACKED_FIELD } from '@/shared/stacked';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogTitleBar } from '@/shared/ui/dialog';
import { useGenerateRecurring, useRecurringCandidates } from './api';
import {
  generateRequest,
  recurringRows,
  recurringSummary,
  withDateChecked,
  withSeriesChecked,
  type RecurringDraft,
  type RecurringDrafts,
  type RecurringRow,
} from './view-model';

// Lançamento, Tipo, Data, Valor and Último lançado after the checkbox, as in the design.
/**
 * From 768px, the design's table. Below that each entry stacks: its checkbox and name, then the date
 * and value fields under their labels, then its type and last occurrence.
 */
const ROW_GRID =
  'grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 md:grid-cols-[36px_minmax(220px,1fr)_96px_168px_148px_150px] md:gap-3 md:px-4';

const checkboxClass =
  'size-[18px] border-input data-[state=checked]:border-primary data-[state=checked]:bg-primary';

interface RecurringDialogProps {
  month: MonthKey;
  open: boolean;
  onClose: () => void;
}

export function RecurringDialog({ month, open, onClose }: RecurringDialogProps) {
  const { t } = usePreferences();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[1040px] overflow-hidden bg-card">
        <DialogTitleBar
          title={t('recurring.dialogTitle')}
          description={t('recurring.dialogDescription', monthLabel(month, t))}
        />
        {/* Remount on every open so the review starts from the suggestions again. */}
        {open && <RecurringReview month={month} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RecurringReview({ month, onClose }: Omit<RecurringDialogProps, 'open'>) {
  const l10n = usePreferences();
  const { t, money } = l10n;
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
  const rows = recurringRows(candidates, drafts, categoryMap, l10n);
  const summary = recurringSummary(candidates, drafts, l10n);

  const updateRow = (row: RecurringRow, change: (draft: RecurringDraft) => RecurringDraft) => {
    setDrafts((previous) => ({
      ...previous,
      [row.seriesId]: change(
        previous[row.seriesId] ?? { include: row.include, date: row.date, value: row.value, skipped: [] },
      ),
    }));
    setError('');
  };
  const toggleAll = () =>
    rows.forEach((row) => updateRow(row, (draft) => withSeriesChecked(row, draft, !summary.allSelected)));

  const submit = () => {
    const result = generateRequest(month, candidates, drafts, l10n);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    generate.mutate(result.request, {
      onSuccess: ({ transactions }) => {
        toast(t('recurring.generated', transactions.length));
        onClose();
      },
      onError: (err) => {
        if (!isUnauthorized(err)) setError(err.message);
      },
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-5 sm:px-6">
        {rows.length ? (
          <>
            <p className="m-0 text-sm text-icon">
              {t('recurring.introBefore')}
              <strong>{t('recurring.introStrong')}</strong>
              {t('recurring.introAfter')}
            </p>
            <div className="overflow-hidden rounded-xl border">
              <div className="md:overflow-x-auto">
                <div className="md:min-w-[880px]">
                  <div
                    className={cn(
                      ROW_GRID,
                      'min-h-11 border-b bg-muted text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase',
                    )}
                  >
                    <Checkbox
                      aria-label={t('recurring.selectAll')}
                      checked={summary.allSelected}
                      onCheckedChange={toggleAll}
                      className={checkboxClass}
                    />
                    <span className="col-span-2 md:col-auto">{t('recurring.columnEntry')}</span>
                    <span className="hidden md:block">{t('recurring.columnType')}</span>
                    <span className="hidden md:block">{t('recurring.columnDate')}</span>
                    <span className="hidden text-right md:block">
                      {t('recurring.columnValue', money.symbol)}
                    </span>
                    <span className="hidden text-right md:block">{t('recurring.columnLast')}</span>
                  </div>
                  {rows.map((row) => (
                    <ReviewRow
                      key={row.seriesId}
                      row={row}
                      month={month}
                      onChange={(change) => updateRow(row, change)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-5 py-12 text-center text-muted-foreground">
            <CalendarCheck className="size-7 text-income" aria-hidden="true" />
            <span className="text-base font-semibold text-ink">{t('recurring.allDoneTitle')}</span>
            <span>{t('recurring.allDoneText', monthLabel(month, t))}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t bg-muted px-4 py-4 sm:px-6">
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
            {t('recurring.cancel')}
          </DialogClose>
          <button
            type="button"
            onClick={submit}
            disabled={!summary.canGenerate || generate.isPending}
            className="min-h-11 rounded-[10px] bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-neutral-swatch"
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
  onChange: (change: (draft: RecurringDraft) => RecurringDraft) => void;
}) {
  const { t, money } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[row.type];
  const inputClass =
    'min-h-11 w-full min-w-0 md:min-h-10 rounded-lg border border-input bg-card px-2.5 text-sm text-ink';
  return (
    <div
      className={cn(
        ROW_GRID,
        'min-h-[60px] border-b border-divider py-3 last:border-b-0 md:py-2',
        !row.include && 'opacity-50',
      )}
    >
      <Checkbox
        aria-label={row.includeLabel}
        checked={row.include}
        onCheckedChange={(checked) => onChange((draft) => withSeriesChecked(row, draft, checked === true))}
        className={checkboxClass}
      />
      <span className="col-span-2 flex min-w-0 flex-col md:col-auto">
        <span id={`series-${row.seriesId}`} className="font-semibold">
          {row.description}
        </span>
        <span className="text-[13px] text-muted-foreground">{row.meta}</span>
      </span>
      <span
        className={cn(
          'justify-self-start rounded-full px-2.5 py-[3px] text-[13px] font-semibold [grid-area:3/1/4/3] md:[grid-area:auto]',
          meta.bg,
          meta.text,
        )}
      >
        {row.typeLabel}
      </span>
      {row.weekly ? (
        <div
          data-label={t('recurring.columnDate')}
          className={cn(STACKED_FIELD, 'items-start [grid-area:2/1/3/3]')}
        >
          <span className="flex min-h-11 flex-wrap items-center gap-x-2 text-sm md:min-h-10">
            {row.occurrencesLabel}
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? `dates-${row.seriesId}` : undefined}
              onClick={() => setExpanded((open) => !open)}
              className="min-h-11 rounded-md px-1 text-sm font-semibold text-primary hover:underline md:min-h-8"
            >
              {t(expanded ? 'recurring.hideDates' : 'recurring.showDates')}
            </button>
          </span>
        </div>
      ) : (
        <label data-label={t('recurring.columnDate')} className={cn(STACKED_FIELD, '[grid-area:2/1/3/3]')}>
          <input
            type="date"
            aria-label={row.dateLabel}
            value={row.date}
            min={`${month}-01`}
            max={`${month}-${pad2(lastDayOfMonth(month))}`}
            onChange={(e) => onChange((draft) => ({ ...draft, date: e.target.value }))}
            className={inputClass}
          />
        </label>
      )}
      <label
        data-label={t('recurring.columnValue', money.symbol)}
        className={cn(STACKED_FIELD, '[grid-area:2/3/3/4]')}
      >
        <input
          type="text"
          inputMode="decimal"
          aria-label={row.valueLabel}
          value={row.value}
          onChange={(e) => onChange((draft) => ({ ...draft, value: e.target.value }))}
          className={cn(inputClass, 'text-right font-mono font-medium')}
        />
      </label>
      {/* Stacked, the pill reaches into this cell's column, so the text keeps clear of it and may wrap. */}
      <span className="text-right font-mono text-[13px] text-muted-foreground [grid-area:3/2/4/4] max-md:pl-12 md:[grid-area:auto]">
        {row.lastLabel}
      </span>
      {row.weekly && expanded && (
        <ul
          id={`dates-${row.seriesId}`}
          aria-labelledby={`series-${row.seriesId}`}
          className="col-span-full m-0 grid list-none grid-cols-2 gap-x-5 gap-y-1 p-0 md:flex md:flex-wrap md:pl-[48px]"
        >
          {row.dates.map(({ date, label, checked }) => (
            <li key={date}>
              <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-9">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => onChange((draft) => withDateChecked(draft, date, next === true))}
                  className={checkboxClass}
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
