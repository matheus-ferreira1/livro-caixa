import type { MonthKey } from '@livro-caixa/domain';
import { Repeat } from 'lucide-react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { useRecurringCandidates } from './api';
import { useRecurringDismissal } from './dismissal';
import { recurringBannerHelp, recurringBannerText } from './view-model';

/** Month mode only: recurring entries of the month that were not generated yet. */
export function RecurringBanner({ month, onReview }: { month: MonthKey; onReview: () => void }) {
  const l10n = usePreferences();
  const { data: candidates = [] } = useRecurringCandidates(month, true);
  const { dismissed, dismiss } = useRecurringDismissal(month);
  if (candidates.length === 0 || dismissed) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-settlement-bg px-4 py-3.5 text-info-text"
    >
      <Repeat className="size-5 flex-none" aria-hidden="true" />
      <span className="flex flex-[1_1_320px] flex-col gap-0.5">
        <span className="font-semibold">{recurringBannerText(candidates.length, month, l10n)}</span>
        <span className="text-sm">{recurringBannerHelp(candidates, l10n)}</span>
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-[10px] px-3.5 font-semibold hover:bg-card/50"
        >
          {l10n.t('recurring.dismiss')}
        </button>
        <button
          type="button"
          onClick={onReview}
          className="min-h-11 rounded-[10px] bg-settlement px-4 font-semibold text-on-accent hover:bg-settlement/90"
        >
          {l10n.t('recurring.reviewAndGenerate')}
        </button>
      </div>
    </div>
  );
}
