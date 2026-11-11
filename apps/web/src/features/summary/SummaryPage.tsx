import { monthOf, todayIso, type MessageKey, type SummaryMode } from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { ArrowButton } from '@/shared/ArrowButton';
import { Segmented } from '@/shared/Segmented';
import { SummaryTiles } from '@/shared/SummaryTiles';
import { useYearSummary } from './api';
import { BalanceChart } from './components/BalanceChart';
import { SummaryTable } from './components/SummaryTable';
import { useSummaryState } from './useSummaryState';
import { summaryViewModel } from './view-model';

const MODE_HINTS = {
  real: 'summary.hintReal',
  proj: 'summary.hintProj',
} as const satisfies Record<SummaryMode, MessageKey>;

export function SummaryPage() {
  const l10n = usePreferences();
  const { t } = l10n;
  const { year, mode, update } = useSummaryState();
  const modeOptions = [
    ['real', t('summary.modeReal')],
    ['proj', t('summary.modeProj')],
  ] as const;
  const { data } = useYearSummary(year, mode);
  const summary = data && summaryViewModel(data, monthOf(todayIso()), l10n);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t('summary.eyebrow')}
          </span>
          <div className="flex items-center gap-2">
            <ArrowButton label={t('summary.previousYear')} onClick={() => update({ year: year - 1 })}>
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </ArrowButton>
            <h1 className="m-0 min-w-[120px] text-center font-mono text-[32px] font-bold tracking-[-0.02em]">
              {year}
            </h1>
            <ArrowButton label={t('summary.nextYear')} onClick={() => update({ year: year + 1 })}>
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </ArrowButton>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:items-end">
          <Segmented
            label={t('summary.modeLabel')}
            value={mode}
            options={modeOptions}
            onChange={(next) => update({ mode: next })}
            className="self-start sm:self-end"
          />
          <span className="text-[13px] text-muted-foreground sm:text-right">{t(MODE_HINTS[mode])}</span>
        </div>
      </div>

      {summary && data && (
        <>
          <SummaryTiles tiles={summary.tiles} />
          <BalanceChart months={summary.months} zeroLineTop={summary.zeroLineTop} />
          <SummaryTable year={data.year} months={summary.months} totals={summary.totals} />
          <p className="m-0 text-[13px] text-muted-foreground">{t('summary.footnote')}</p>
        </>
      )}
    </div>
  );
}
