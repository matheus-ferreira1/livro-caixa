import { monthLabel, shiftMonth, todayIso, type SummaryMode } from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { RecurringDialog } from '@/features/recurring/RecurringDialog';
import { SettlementDialog } from '@/features/settlement/SettlementDialog';
import { ArrowButton } from '@/shared/ArrowButton';
import { Segmented } from '@/shared/Segmented';
import { SummaryTiles } from '@/shared/SummaryTiles';
import { useDashboard } from './api';
import { CategoryDonut } from './components/CategoryDonut';
import { IncomeExpenseChart } from './components/IncomeExpenseChart';
import { OpenItemsCard } from './components/OpenItemsCard';
import { SettlementCard } from './components/SettlementCard';
import { useDashboardState } from './useDashboardState';
import { dashboardViewModel } from './view-model';

const MODE_OPTIONS = [
  ['real', 'Realizado'],
  ['proj', 'Com previstos'],
] as const;

const MODE_HINTS: Record<SummaryMode, string> = {
  real: 'Só lançamentos confirmados.',
  proj: 'Inclui previstos e o acerto esperado.',
};

export function DashboardPage() {
  const { month, mode, update } = useDashboardState();
  const { data } = useDashboard(month, mode);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const dashboard = data && dashboardViewModel(data, todayIso());

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Visão geral
          </span>
          <div className="flex items-center gap-2">
            <ArrowButton label="Mês anterior" onClick={() => update({ month: shiftMonth(month, -1) })}>
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </ArrowButton>
            <h1 className="m-0 min-w-0 text-center text-[clamp(24px,7vw,32px)] font-bold tracking-[-0.02em] whitespace-nowrap sm:min-w-[248px]">
              {monthLabel(month)}
            </h1>
            <ArrowButton label="Próximo mês" onClick={() => update({ month: shiftMonth(month, 1) })}>
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </ArrowButton>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:items-end">
          <Segmented
            label="Valores considerados"
            value={mode}
            options={MODE_OPTIONS}
            onChange={(next) => update({ mode: next })}
            className="self-start sm:self-end"
          />
          <span className="text-[13px] text-muted-foreground sm:text-right">{MODE_HINTS[mode]}</span>
        </div>
      </div>

      {dashboard && data && (
        <>
          <SummaryTiles tiles={dashboard.tiles} />
          <IncomeExpenseChart {...dashboard.chart} tableHref={dashboard.tableHref} />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(560px,100%),1fr))] items-start gap-4">
            {/* While another month loads the cards keep the last data, so they name that data's month. */}
            <CategoryDonut donut={dashboard.donut} monthLabel={monthLabel(data.month)} />
            <div className="flex flex-col gap-4">
              <OpenItemsCard
                open={dashboard.open}
                month={data.month}
                monthLabel={monthLabel(data.month)}
                onReviewRecurring={() => setRecurringOpen(true)}
              />
              <SettlementCard
                settlement={dashboard.settlement}
                partnerName={data.partnerName}
                onOpen={() => setSettlementOpen(true)}
              />
            </div>
          </div>
        </>
      )}

      <SettlementDialog month={month} open={settlementOpen} onClose={() => setSettlementOpen(false)} />
      <RecurringDialog month={month} open={recurringOpen} onClose={() => setRecurringOpen(false)} />
    </div>
  );
}
