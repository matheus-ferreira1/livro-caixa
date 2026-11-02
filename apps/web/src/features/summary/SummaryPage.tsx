import { monthOf, todayIso, type SummaryMode } from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Segmented } from '@/shared/Segmented';
import { SummaryTiles } from '@/shared/SummaryTiles';
import { useYearSummary } from './api';
import { BalanceChart } from './components/BalanceChart';
import { SummaryTable } from './components/SummaryTable';
import { useSummaryState } from './useSummaryState';
import { summaryViewModel } from './view-model';

const MODE_OPTIONS = [
  ['real', 'Realizado'],
  ['proj', 'Com previstos'],
] as const;

const MODE_HINTS: Record<SummaryMode, string> = {
  real: 'Só lançamentos confirmados.',
  proj: 'Inclui previstos e o acerto esperado das contas divididas.',
};

export function SummaryPage() {
  const { year, mode, update } = useSummaryState();
  const { data } = useYearSummary(year, mode);
  const summary = data && summaryViewModel(data, monthOf(todayIso()));

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Resumo mensal
          </span>
          <div className="flex items-center gap-2">
            <YearArrow label="Ano anterior" onClick={() => update({ year: year - 1 })}>
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </YearArrow>
            <h1 className="m-0 min-w-[120px] text-center font-mono text-[32px] font-bold tracking-[-0.02em]">
              {year}
            </h1>
            <YearArrow label="Próximo ano" onClick={() => update({ year: year + 1 })}>
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </YearArrow>
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

      {summary && data && (
        <>
          <SummaryTiles tiles={summary.tiles} />
          <BalanceChart months={summary.months} zeroLineTop={summary.zeroLineTop} />
          <SummaryTable year={data.year} months={summary.months} totals={summary.totals} />
          <p className="m-0 text-[13px] text-muted-foreground">
            Balanço = receitas + acertos − despesas. O acerto entra no balanço porque compensa a parte das
            contas divididas que você pagou, mas não conta como receita.
          </p>
        </>
      )}
    </div>
  );
}

function YearArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-[10px] border bg-card text-ink hover:bg-accent"
    >
      {children}
    </button>
  );
}
