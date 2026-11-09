import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import type { EvolutionBar, EvolutionTick } from '../view-model';

// Below 640px the chart shrinks to the screen instead of scrolling, so its columns are narrow.
const MONTH_GRID = 'grid grid-cols-[repeat(12,minmax(0,1fr))] gap-0.5 sm:gap-1.5';
const PLOT_HEIGHT = 'h-[220px]';

const TOOLTIP_ALIGN: Record<EvolutionBar['tooltipAlign'], string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const LEGEND = [
  { label: 'Fechado', background: 'bg-chart-income' },
  { label: 'Mês em aberto', background: 'bg-chart-open-month' },
];

export function EvolutionChart({ ticks, bars }: { ticks: EvolutionTick[]; bars: EvolutionBar[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="wealth-chart-title"
      className="flex flex-col gap-4 rounded-[14px] border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="wealth-chart-title" className="m-0 text-base font-bold">
            Evolução mês a mês
          </h2>
          <span className="text-[13px] text-muted-foreground">
            Valor em cada fechamento. Passe o mouse para ver aportes e rendimento.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-icon">
          {LEGEND.map(({ label, background }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-3 rounded-[3px]', background)} />
              {label}
            </span>
          ))}
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
                {bars.map((bar) => (
                  <MonthBar
                    key={bar.month}
                    bar={bar}
                    hovered={hovered === bar.month}
                    onEnter={() => setHovered(bar.month)}
                    onLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            </div>
            <div className={MONTH_GRID}>
              {bars.map((bar) => (
                <span
                  key={bar.month}
                  className={cn(
                    'text-center text-[11px] leading-tight sm:text-[12.5px] sm:leading-[inherit] sm:whitespace-nowrap',
                    bar.partial ? 'font-bold text-ink' : 'font-medium text-muted-foreground',
                  )}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthBar({
  bar,
  hovered,
  onEnter,
  onLeave,
}: {
  bar: EvolutionBar;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      role="img"
      aria-label={bar.ariaLabel}
      tabIndex={0}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onBlur={onLeave}
      className={cn(
        'relative flex h-full items-end justify-center rounded-sm px-[8%] sm:rounded-lg sm:px-[14%]',
        hovered && 'bg-hover-track',
      )}
    >
      <div
        className={cn(
          'w-full max-w-[32px] rounded-t',
          bar.partial ? 'bg-chart-open-month' : 'bg-chart-income',
        )}
        style={{ height: bar.height }}
      />
      {hovered && (
        <div
          className={cn(
            'pointer-events-none absolute top-1.5 z-5 flex w-[220px] flex-col gap-1.5 rounded-[10px] bg-ink px-3.5 py-3 text-[13px] text-background shadow-[0_10px_28px_rgba(23,32,28,0.28)]',
            TOOLTIP_ALIGN[bar.tooltipAlign],
          )}
        >
          <span className="font-bold">{bar.title}</span>
          <TooltipRow label="Patrimônio" value={bar.total} />
          <TooltipRow label="Variação" value={bar.change} />
          <TooltipRow label="Aportes" value={bar.contributions} />
          <TooltipRow label="Rendimento" value={bar.yieldLabel} />
        </div>
      )}
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}
