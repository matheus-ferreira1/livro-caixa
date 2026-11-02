import { cn } from '@/shared/lib/utils';
import type { SettlementTone, SettlementViewModel } from '../view-model';

const STATUS_CLASSES: Record<SettlementTone, string> = {
  none: 'bg-hover-track text-muted-foreground',
  open: 'bg-pending-bg text-pending',
  settled: 'bg-income-bg text-income',
};

interface SettlementCardProps {
  settlement: SettlementViewModel;
  partnerName: string;
  onOpen: () => void;
}

export function SettlementCard({ settlement, partnerName, onOpen }: SettlementCardProps) {
  return (
    <section
      aria-labelledby="dash-acerto-title"
      className="flex flex-col gap-3 rounded-[14px] border bg-card px-5 py-[18px]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="dash-acerto-title" className="m-0 text-base font-bold">
          Acerto com {partnerName}
        </h2>
        <span
          className={cn(
            'rounded-full px-2.5 py-[3px] text-[13px] font-semibold',
            STATUS_CLASSES[settlement.statusTone],
          )}
        >
          {settlement.status}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-2xl font-semibold text-settlement">{settlement.pending}</span>
        <span className="text-[13px] text-muted-foreground">
          a receber de {settlement.expected} esperados
        </span>
      </div>
      <div
        role="img"
        aria-label={settlement.progressAria}
        className="flex h-2 overflow-hidden rounded-full bg-settlement-bg"
      >
        <span className="rounded-full bg-settlement" style={{ width: settlement.progress }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[13px] text-muted-foreground">{settlement.detail}</span>
        <button
          type="button"
          onClick={onOpen}
          className="min-h-11 rounded-[10px] border border-settlement bg-card px-3.5 text-sm font-semibold text-settlement hover:bg-settlement-bg"
        >
          Abrir acerto
        </button>
      </div>
    </section>
  );
}
