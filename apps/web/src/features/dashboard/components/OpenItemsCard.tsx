import type { DueTone, MonthKey } from '@livro-caixa/domain';
import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useRecurringCandidates } from '@/features/recurring/api';
import { useToggleFlags } from '@/features/transactions/api';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import type { OpenRow, OpenViewModel } from '../view-model';

const DUE_TEXT: Record<DueTone, string> = {
  late: 'text-expense',
  soon: 'text-pending',
  later: 'text-muted-foreground',
};

interface OpenItemsCardProps {
  open: OpenViewModel;
  month: MonthKey;
  monthLabel: string;
  onReviewRecurring: () => void;
}

export function OpenItemsCard({ open, month, monthLabel, onReviewRecurring }: OpenItemsCardProps) {
  const { t } = usePreferences();
  const { data: candidates = [] } = useRecurringCandidates(month, true);
  const toggle = useToggleFlags();
  const confirm = (row: OpenRow) =>
    toggle.mutate(
      { id: row.id, confirmed: true },
      { onSuccess: () => toast(t('dashboard.confirmed', row.description)) },
    );

  return (
    <section aria-labelledby="open-title" className="overflow-hidden rounded-[14px] border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-[18px] pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="open-title" className="m-0 text-base font-bold">
            {t('dashboard.openTitle')}
          </h2>
          <span className="text-[13px] text-muted-foreground">{open.summary}</span>
        </div>
        <span className="flex flex-col items-end font-mono text-[13px] font-semibold">
          <span className="text-expense">− {open.outflow}</span>
          <span className="text-income">+ {open.inflow}</span>
        </span>
      </div>
      {candidates.length > 0 && (
        <div className="mx-5 mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] bg-settlement-bg px-3.5 py-3 text-sm text-info-text">
          <span className="font-semibold">{t('dashboard.recurringPending', candidates.length)}</span>
          <button
            type="button"
            onClick={onReviewRecurring}
            className="min-h-11 rounded-lg bg-settlement px-3 text-[13px] font-semibold text-white hover:bg-settlement/90"
          >
            {t('dashboard.recurringReview')}
          </button>
        </div>
      )}
      {open.rows.map((row) => (
        <OpenRowItem key={row.id} row={row} disabled={toggle.isPending} onConfirm={() => confirm(row)} />
      ))}
      {open.more && (
        <div className="border-t border-divider px-5 pt-2.5 pb-3.5">
          <Link
            to={open.more.href}
            className="flex min-h-11 w-fit items-center text-sm font-semibold text-settlement hover:underline"
          >
            {open.more.label}
          </Link>
        </div>
      )}
      {open.rows.length === 0 && (
        <p className="m-0 border-t border-divider px-5 pt-[18px] pb-[22px] text-sm text-muted-foreground">
          {t('dashboard.openNothing', monthLabel)}
        </p>
      )}
    </section>
  );
}

function OpenRowItem({
  row,
  disabled,
  onConfirm,
}: {
  row: OpenRow;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const { t } = usePreferences();
  return (
    // On phones the button takes a line of its own, or the description would have no room.
    <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-divider px-5 py-2.5 sm:grid-cols-[64px_minmax(0,1fr)_auto_auto]">
      <span className="flex flex-col font-mono text-[13px] font-medium">
        {row.day}
        <span className={cn('font-sans text-xs font-semibold', DUE_TEXT[row.whenTone])}>{row.when}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{row.description}</span>
        <span className="text-xs text-muted-foreground">{row.meta}</span>
      </span>
      <span className={cn('font-mono text-sm font-semibold whitespace-nowrap', row.valueClass)}>
        {row.value}
      </span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        aria-label={row.confirmLabel}
        className="col-span-full flex min-h-11 items-center gap-1.5 justify-self-end rounded-lg border border-income-border bg-card px-2.5 text-[13px] font-semibold text-income hover:bg-income-bg disabled:opacity-60 sm:col-span-1"
      >
        <Check className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
        {t('dashboard.confirm')}
      </button>
    </div>
  );
}
