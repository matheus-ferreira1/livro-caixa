import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { DeltaArrow, deltaTextClass } from '@/shared/SummaryTiles';
import { DONUT_RADIUS, type DonutLegendItem, type DonutViewModel } from '../view-model';

const DONUT_CENTER = 100;
const STROKE_WIDTH = 24;
const STROKE_WIDTH_HOVERED = 30;
const DIMMED_OPACITY = 0.35;

export function CategoryDonut({ donut, monthLabel }: { donut: DonutViewModel | null; monthLabel: string }) {
  return (
    <section aria-labelledby="donut-title" className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="donut-title" className="m-0 text-base font-bold">
          Despesas por categoria
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {monthLabel} · comparado à média dos 12 meses anteriores
        </span>
      </div>
      {donut ? (
        <DonutWithLegend donut={donut} />
      ) : (
        <p className="m-0 py-10 text-center text-muted-foreground">
          Nenhuma despesa em {monthLabel} com o filtro atual.
        </p>
      )}
    </section>
  );
}

function DonutWithLegend({ donut }: { donut: DonutViewModel }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const center = donut.legend.find((item) => item.id === hovered)?.center ?? donut.center;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative mx-auto size-[220px] flex-none" onMouseLeave={() => setHovered(null)}>
        <svg width="220" height="220" viewBox="0 0 200 200" role="img" aria-label={donut.ariaLabel}>
          <circle
            cx={DONUT_CENTER}
            cy={DONUT_CENTER}
            r={DONUT_RADIUS}
            fill="none"
            className="stroke-hover-track"
            strokeWidth={STROKE_WIDTH}
          />
          {donut.segments.map((segment) => (
            <circle
              key={segment.id}
              cx={DONUT_CENTER}
              cy={DONUT_CENTER}
              r={DONUT_RADIUS}
              fill="none"
              transform={`rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})`}
              onMouseEnter={() => setHovered(segment.id)}
              className="cursor-pointer transition-[stroke-width,opacity] duration-[120ms]"
              stroke={segment.color}
              strokeWidth={hovered === segment.id ? STROKE_WIDTH_HOVERED : STROKE_WIDTH}
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.offset}
              opacity={hovered && hovered !== segment.id ? DIMMED_OPACITY : 1}
            />
          ))}
        </svg>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-11 flex flex-col items-center justify-center gap-0.5 text-center"
        >
          <span className="max-w-[120px] text-[12.5px] font-semibold text-muted-foreground">
            {center.title}
          </span>
          <span className="font-mono text-[17px] font-semibold">{center.value}</span>
          <span className="text-xs text-muted-foreground">{center.sub}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col">
        {donut.legend.map((item) => (
          <LegendRow
            key={item.id}
            item={item}
            active={hovered === item.id}
            onEnter={() => setHovered(item.id)}
            onLeave={() => setHovered(null)}
          />
        ))}
      </div>
    </div>
  );
}

function LegendRow({
  item,
  active,
  onEnter,
  onLeave,
}: {
  item: DonutLegendItem;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      className={cn(
        'grid min-h-11 cursor-default grid-cols-[12px_minmax(0,1fr)_auto_52px] items-center gap-2.5 border-b border-divider px-2.5 text-left text-sm',
        active && 'bg-accent',
      )}
    >
      <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: item.color }} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{item.name}</span>
        <span
          className={cn('flex items-center gap-1 text-xs font-semibold', deltaTextClass(item.delta.tone))}
        >
          <DeltaArrow direction={item.delta.direction} className="size-3" />
          {item.delta.label}
        </span>
      </span>
      <span className="text-right font-mono font-semibold">{item.value}</span>
      <span className="text-right font-mono text-[13px] text-muted-foreground">{item.percent}</span>
    </button>
  );
}
