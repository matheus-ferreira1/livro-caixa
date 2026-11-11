import {
  closingDraft,
  closingRequestFrom,
  monthLabel,
  type ClosingEdits,
  type IsoDate,
  type Wealth,
} from '@livro-caixa/domain';
import { useState } from 'react';
import { toast } from 'sonner';
import { isUnauthorized } from '@/shared/api/query-client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { STACKED_CELL_LABEL, STACKED_FIELD } from '@/shared/stacked';
import { Dialog, DialogClose, DialogContent, DialogTitleBar } from '@/shared/ui/dialog';
import { useRegisterClosing } from '../api';
import { closingSubtitle, closingView, type ClosingRowView } from '../closing-view-model';
import { PricingTag } from './PricingTag';

/**
 * From 768px, the design's table. Below that each asset stacks: its name beside the last value,
 * then the two fields side by side under their labels.
 */
const ROW_GRID =
  'grid grid-cols-2 items-center gap-x-3 gap-y-2 px-3 md:grid-cols-[minmax(180px,1fr)_130px_150px_150px] md:gap-3 md:px-4';
const AMOUNT_INPUT =
  'min-h-11 w-full min-w-0 rounded-lg border bg-card px-2.5 text-right font-mono text-sm font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const toneClass = (cents: number | null) => {
  if (cents === null || cents === 0) return 'text-muted-foreground';
  return cents > 0 ? 'text-income' : 'text-expense';
};

interface ClosingDialogProps {
  wealth: Wealth;
  today: IsoDate;
  open: boolean;
  onClose: () => void;
}

export function ClosingDialog({ wealth, today, open, onClose }: ClosingDialogProps) {
  const localization = usePreferences();
  const { t } = localization;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[1000px] overflow-hidden bg-card">
        <DialogTitleBar
          title={t('wealth.closingOf', monthLabel(wealth.openMonth, t))}
          description={closingSubtitle(wealth.kpis.lastClosing, localization)}
        />
        {/* Remount on every open so the review starts from the stored values again. */}
        {open && <ClosingForm wealth={wealth} today={today} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ClosingForm({ wealth, today, onClose }: Omit<ClosingDialogProps, 'open'>) {
  const l10n = usePreferences();
  const { t, money } = l10n;
  const [edits, setEdits] = useState<ClosingEdits>({});
  const [error, setError] = useState('');
  const register = useRegisterClosing();
  const month = wealth.openMonth;
  const view = closingView(wealth.assets, edits, month, wealth.kpis.lastClosing, Date.now(), l10n);

  const edit = (id: string, patch: ClosingEdits[string]) => {
    setEdits((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
    setError('');
  };

  const submit = () => {
    const result = closingRequestFrom(closingDraft(wealth.assets, edits, money), month, today, t);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    register.mutate(result.request, {
      onSuccess: () => {
        toast(t('wealth.closing.registered', monthLabel(month, t)));
        onClose();
      },
      onError: (err) => {
        if (!isUnauthorized(err)) setError(err.message);
      },
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">
        {view.manualRows.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <h3 className="m-0 text-base font-bold">{t('wealth.closing.manualTitle')}</h3>
              <span className="text-sm text-muted-foreground">{t('wealth.closing.manualHelp')}</span>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="md:overflow-x-auto">
                <div className="md:min-w-[660px]">
                  <div
                    className={cn(
                      ROW_GRID,
                      'min-h-11 border-b max-md:hidden bg-muted text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase',
                    )}
                  >
                    <span>{t('wealth.colAsset')}</span>
                    <span className="text-right">{t('wealth.closing.colLast')}</span>
                    <span className="text-right">{t('wealth.closing.colFlow')}</span>
                    <span className="text-right">{t('wealth.closing.colValue')}</span>
                  </div>
                  {view.manualRows.map((row) => (
                    <ManualRow key={row.id} row={row} onChange={(patch) => edit(row.id, patch)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view.autoRows.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <h3 className="m-0 text-base font-bold">{t('wealth.closing.autoTitle')}</h3>
              <span className="text-sm text-muted-foreground">{view.autoNote}</span>
            </div>
            <div className="overflow-hidden rounded-xl border">
              {view.autoRows.map((row) => (
                <div
                  key={row.id}
                  className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-divider px-4 py-2 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{row.name}</span>
                    <span className="text-[13px] text-muted-foreground">{row.subtitle}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                      <PricingTag tag={row.pricingTag} />
                      {row.priceNote && <span>{row.priceNote}</span>}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 border-t bg-muted px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Total label={t('wealth.closing.totalWealth')} value={view.total} />
          <Total
            label={t('wealth.closing.totalChange')}
            value={view.change}
            className={toneClass(view.changeCents)}
          />
          <Total label={t('wealth.closing.totalContributions')} value={view.contributions} />
          <Total
            label={t('wealth.closing.totalYield')}
            value={view.yieldLabel}
            className={toneClass(view.yieldCents)}
          />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {error && (
            <span role="alert" className="text-sm font-semibold text-expense">
              {error}
            </span>
          )}
          <div className="flex flex-wrap justify-end gap-2.5">
            <DialogClose className="min-h-11 rounded-[10px] border bg-card px-[18px] font-semibold text-ink hover:bg-accent">
              {t('wealth.cancel')}
            </DialogClose>
            <button
              type="button"
              onClick={submit}
              disabled={register.isPending}
              className="min-h-11 rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-ink/90 disabled:bg-icon"
            >
              {view.submitLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ManualRow({
  row,
  onChange,
}: {
  row: ClosingRowView;
  onChange: (patch: { flow?: string; value?: string }) => void;
}) {
  const { t } = usePreferences();
  return (
    <div className={cn(ROW_GRID, 'min-h-[60px] border-b border-divider py-3 last:border-b-0 md:py-2')}>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{row.name}</span>
        <span className="truncate text-[13px] text-muted-foreground">{row.subtitle}</span>
      </span>
      <span
        data-label={t('wealth.closing.colLast')}
        className={cn(STACKED_CELL_LABEL, 'flex flex-col items-end font-mono text-sm')}
      >
        {row.last}
        <span className="font-sans text-xs text-muted-foreground">{row.lastDate}</span>
      </span>
      <label data-label={t('wealth.closing.colFlow')} className={STACKED_FIELD}>
        <input
          type="text"
          aria-label={row.flowLabel}
          aria-invalid={!row.flowValid}
          value={row.flowInput}
          onChange={(e) => onChange({ flow: e.target.value })}
          className={cn(AMOUNT_INPUT, row.flowValid ? 'border-input' : 'border-expense')}
        />
      </label>
      <label data-label={t('wealth.closing.colValue')} className={STACKED_FIELD}>
        <input
          type="text"
          inputMode="decimal"
          aria-label={row.valueLabel}
          aria-invalid={!row.valueValid}
          value={row.valueInput}
          onChange={(e) => onChange({ value: e.target.value })}
          className={cn(AMOUNT_INPUT, row.valueValid ? 'border-input' : 'border-expense')}
        />
      </label>
    </div>
  );
}

function Total({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-[15px] font-semibold', className)}>{value}</span>
    </span>
  );
}
