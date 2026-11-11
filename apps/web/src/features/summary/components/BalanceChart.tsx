import type { MessageKey } from '@livro-caixa/domain';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import type { BarTone, SummaryMonthRow } from '../view-model';

const BAR_BACKGROUND: Record<BarTone, string> = {
  surplus: 'bg-income',
  'surplus-pending': 'bg-income-soft',
  deficit: 'bg-deficit',
  'deficit-pending': 'bg-deficit-soft',
};

const LEGEND = [
  { label: 'summary.legendSurplus', background: 'bg-income' },
  { label: 'summary.legendDeficit', background: 'bg-deficit' },
  { label: 'summary.legendPending', background: 'bg-income-soft' },
] as const satisfies readonly { label: MessageKey; background: string }[];

// Below 640px the chart shrinks to the screen instead of scrolling, so its columns are narrow.
const MONTH_GRID = 'grid grid-cols-[repeat(12,minmax(0,1fr))] gap-0.5 sm:gap-2';
// Leaves room above and below the bars for their value labels.
const PLOT_AREA = 'absolute inset-x-0 top-7 bottom-7';

export function BalanceChart({ months, zeroLineTop }: { months: SummaryMonthRow[]; zeroLineTop: string }) {
  const { t } = usePreferences();
  return (
    <section
      aria-labelledby="balance-chart-title"
      className="flex flex-col gap-4 rounded-[14px] border bg-card px-4 pt-4 pb-4 sm:px-5 sm:pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="balance-chart-title" className="m-0 text-base font-bold">
          {t('summary.chartTitle')}
        </h2>
        <div className="flex flex-wrap gap-4 text-[13px] text-icon">
          {LEGEND.map(({ label, background }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-3 rounded-[3px]', background)} />
              {t(label)}
            </span>
          ))}
        </div>
      </div>
      <div className="sm:overflow-x-auto">
        <div className="flex flex-col gap-2 sm:min-w-[640px]">
          <div className="relative h-60">
            <div aria-hidden="true" className={PLOT_AREA}>
              <div className="absolute inset-x-0 h-px bg-neutral-swatch" style={{ top: zeroLineTop }} />
            </div>
            <div className={cn(MONTH_GRID, 'absolute inset-0')}>
              {months.map((m) => (
                <div key={m.month} className={cn('relative rounded-lg', m.isCurrent && 'bg-background')}>
                  <div className={PLOT_AREA}>{m.bar && <Bar bar={m.bar} />}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={MONTH_GRID}>
            {months.map((m) => (
              <span
                key={m.month}
                className={cn(
                  'text-center text-[11px] sm:text-[13px]',
                  m.isCurrent ? 'font-bold text-ink' : 'font-medium text-muted-foreground',
                )}
              >
                {m.shortName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Bar({ bar }: { bar: NonNullable<SummaryMonthRow['bar']> }) {
  return (
    <>
      <div
        role="img"
        aria-label={bar.ariaLabel}
        className={cn(
          'absolute inset-x-[14%] sm:inset-x-[22%]',
          bar.positive ? 'rounded-t-[4px]' : 'rounded-b-[4px]',
          BAR_BACKGROUND[bar.tone],
        )}
        style={{ top: bar.top, height: bar.height }}
      />
      <span
        aria-hidden="true"
        className={cn(
          // The value does not fit over a narrow column; the table below has it.
          'absolute -inset-x-1 hidden text-center font-mono text-[11.5px] font-semibold whitespace-nowrap sm:block',
          bar.positive ? 'text-income' : 'text-expense',
        )}
        style={{ top: bar.labelTop }}
      >
        {bar.compactLabel}
      </span>
    </>
  );
}
