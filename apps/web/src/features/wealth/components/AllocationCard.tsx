import type { WealthGrouping } from '@livro-caixa/domain';
import { Segmented } from '@/shared/Segmented';
import type { AllocationView } from '../view-model';

const GROUPING_OPTIONS = [
  ['class', 'Por classe'],
  ['institution', 'Por instituição'],
] as const;

interface AllocationCardProps {
  allocation: AllocationView;
  grouping: WealthGrouping;
  onGroupingChange: (grouping: WealthGrouping) => void;
}

export function AllocationCard({ allocation, grouping, onGroupingChange }: AllocationCardProps) {
  return (
    <section
      aria-labelledby="allocation-title"
      className="flex flex-col gap-4 rounded-[14px] border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="allocation-title" className="m-0 text-base font-bold">
          Distribuição da carteira
        </h2>
        <Segmented
          label="Agrupar por"
          value={grouping}
          options={GROUPING_OPTIONS}
          onChange={onGroupingChange}
        />
      </div>
      {allocation.legend.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">Nenhum ativo na carteira.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={allocation.ariaLabel}
            className="flex h-5 gap-0.5 overflow-hidden rounded-md bg-card"
          >
            {allocation.segments.map((segment) => (
              <span key={segment.key} style={{ background: segment.color, flexGrow: segment.grow }} />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-6 gap-y-2">
            {allocation.legend.map((item) => (
              <div
                key={item.key}
                className="grid min-h-7 grid-cols-[12px_minmax(0,1fr)_auto_52px] items-center gap-2 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="size-3 rounded-[3px]"
                  style={{ background: item.color }}
                />
                <span className="truncate font-semibold">{item.name}</span>
                <span className="font-mono text-[13px]">{item.value}</span>
                <span className="text-right font-mono text-[13px] text-muted-foreground">{item.percent}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
