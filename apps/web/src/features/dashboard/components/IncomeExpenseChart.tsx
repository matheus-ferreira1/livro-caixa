import { useState } from 'react';
import { Link } from 'react-router';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import type { ChartGroup, ChartTick } from '../view-model';

// Below 640px the chart shrinks to the screen instead of scrolling, so its columns are narrow.
const MONTH_GRID = 'grid grid-cols-[repeat(12,minmax(0,1fr))] gap-0.5 sm:gap-1.5';
const PLOT_HEIGHT = 'h-[260px]';

const TOOLTIP_ALIGN: Record<ChartGroup['tooltipAlign'], string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const LEGEND = [
  { label: 'dashboard.income', background: 'bg-chart-income' },
  { label: 'dashboard.expense', background: 'bg-chart-expense' },
] as const;

interface IncomeExpenseChartProps {
  ticks: ChartTick[];
  groups: ChartGroup[];
  tableHref: string;
}

export function IncomeExpenseChart({ ticks, groups, tableHref }: IncomeExpenseChartProps) {
  const { t } = usePreferences();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="bars-title"
      className="flex flex-col gap-4 rounded-[14px] border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="bars-title" className="m-0 text-base font-bold">
            {t('dashboard.chartTitle')}
          </h2>
          <span className="text-[13px] text-muted-foreground">{t('dashboard.chartHint')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-icon">
          {LEGEND.map(({ label, background }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-3 rounded-[3px]', background)} />
              {t(label)}
            </span>
          ))}
          <Link
            to={tableHref}
            className="flex min-h-11 items-center rounded-lg border bg-card px-3 text-[13px] font-semibold text-ink hover:bg-accent"
          >
            {t('dashboard.viewTable')}
          </Link>
        </div>
      </div>
      {/* The padding keeps the scroll container from clipping the top tick's label. */}
      <div className="pt-2 sm:overflow-x-auto">
        <div className="flex gap-1.5 sm:min-w-[680px] sm:gap-2.5">
          <div aria-hidden="true" className={cn('relative w-11 flex-none sm:w-[52px]', PLOT_HEIGHT)}>
            {ticks.map((tick) => (
              <span
                key={tick.label}
                className="absolute right-0 -translate-y-1/2 font-mono text-[11.5px] text-muted-foreground"
                style={{ top: tick.top }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className={cn('relative', PLOT_HEIGHT)} onMouseLeave={() => setHovered(null)}>
              {ticks.map((tick) => (
                <div
                  key={tick.label}
                  aria-hidden="true"
                  className={cn('absolute inset-x-0 h-px', tick.isZero ? 'bg-neutral-swatch' : 'bg-divider')}
                  style={{ top: tick.top }}
                />
              ))}
              <div className={cn('absolute inset-0', MONTH_GRID)}>
                {groups.map((group) => (
                  <MonthBars
                    key={group.month}
                    group={group}
                    hovered={hovered === group.month}
                    onEnter={() => setHovered(group.month)}
                    onLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            </div>
            <div className={MONTH_GRID}>
              {groups.map((group) => (
                <span
                  key={group.month}
                  className={cn(
                    'text-center text-[11px] leading-tight sm:text-[12.5px] sm:leading-[inherit] sm:whitespace-nowrap',
                    group.current ? 'font-bold text-ink' : 'font-medium text-muted-foreground',
                  )}
                >
                  {group.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthBars({
  group,
  hovered,
  onEnter,
  onLeave,
}: {
  group: ChartGroup;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      role="img"
      aria-label={group.ariaLabel}
      tabIndex={0}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn(
        // Below 640px a column is narrower than its tooltip, which is then placed against the whole plot.
        'flex h-full items-end justify-center sm:relative gap-0.5 rounded-sm px-[8%] sm:rounded-lg sm:px-[14%]',
        hovered && 'bg-hover-track',
      )}
    >
      <div className="max-w-[22px] flex-1 rounded-t bg-chart-income" style={{ height: group.incomeHeight }} />
      <div
        className="max-w-[22px] flex-1 rounded-t bg-chart-expense"
        style={{ height: group.expenseHeight }}
      />
      {hovered && <Tooltip group={group} />}
    </div>
  );
}

function Tooltip({ group }: { group: ChartGroup }) {
  const { t } = usePreferences();
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1.5 z-5 flex w-[210px] flex-col gap-1.5 rounded-[10px] bg-ink px-3.5 py-3 text-[13px] text-background shadow-[0_10px_28px_rgba(23,32,28,0.28)]',
        TOOLTIP_ALIGN[group.tooltipAlign],
      )}
    >
      <span className="font-bold">{group.title}</span>
      {group.hasData ? (
        <>
          <TooltipRow label={t('dashboard.income')} value={group.income} swatch="bg-chart-income-on-dark" />
          <TooltipRow label={t('dashboard.expense')} value={group.expense} swatch="bg-chart-expense" />
          <TooltipRow
            label={t('dashboard.settlement')}
            value={group.settlement}
            className="text-on-dark-muted"
          />
          <TooltipRow
            label={t('dashboard.balance')}
            value={group.balance}
            className="border-t border-tooltip-divider pt-1.5 font-semibold"
          />
        </>
      ) : (
        <span className="text-on-dark-muted">{t('dashboard.noEntries')}</span>
      )}
    </div>
  );
}

function TooltipRow({
  label,
  value,
  swatch,
  className,
}: {
  label: string;
  value: string;
  swatch?: string;
  className?: string;
}) {
  return (
    <span className={cn('flex justify-between gap-2', className)}>
      <span className="flex items-center gap-1.5">
        {swatch && <span aria-hidden="true" className={cn('size-2 rounded-[2px]', swatch)} />}
        {label}
      </span>
      <span className="font-mono">{value}</span>
    </span>
  );
}
