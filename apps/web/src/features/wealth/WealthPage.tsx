import { draftFromAsset, emptyAssetDraft, todayIso, type WealthGrouping } from '@livro-caixa/domain';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { SummaryTiles } from '@/shared/SummaryTiles';
import { useWealth } from './api';
import { closingBanner, type ClosingBanner as ClosingBannerView } from './closing-view-model';
import { AllocationCard } from './components/AllocationCard';
import { AssetFormSheet, type AssetFormTarget } from './components/AssetFormSheet';
import { AssetsTable } from './components/AssetsTable';
import { ClosingDialog } from './components/ClosingDialog';
import { EvolutionChart } from './components/EvolutionChart';
import { wealthViewModel } from './view-model';

export function WealthPage() {
  const today = todayIso();
  const { data } = useWealth(today);
  const [grouping, setGrouping] = useState<WealthGrouping>('class');
  const [calm, setCalm] = useState(true);
  const [formTarget, setFormTarget] = useState<AssetFormTarget | null>(null);
  const [closingOpen, setClosingOpen] = useState(false);
  const wealth = data && wealthViewModel(data, grouping, calm, Date.now());
  const openNewAsset = () => setFormTarget({ id: null, draft: emptyAssetDraft() });

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-8 pb-16">
      {wealth && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Patrimônio
              </span>
              <h1 className="m-0 font-mono text-[clamp(28px,8vw,36px)] font-semibold tracking-[-0.03em]">
                {wealth.total}
              </h1>
              <span className="text-sm text-muted-foreground">{wealth.assetCount}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CalmToggle calm={calm} onToggle={() => setCalm(!calm)} />
              <button
                type="button"
                onClick={openNewAsset}
                className="flex min-h-11 items-center gap-2 rounded-[10px] border border-input bg-card px-[18px] font-semibold text-ink hover:bg-accent"
              >
                <Plus className="size-[18px]" aria-hidden="true" />
                Novo ativo
              </button>
              <button
                type="button"
                onClick={() => setClosingOpen(true)}
                disabled={!data.closingAvailable}
                className="min-h-11 rounded-[10px] bg-ink px-[18px] font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-neutral-swatch"
              >
                {data.closingAvailable ? 'Fazer fechamento' : 'Fechamento em dia'}
              </button>
            </div>
          </div>

          <ClosingBanner banner={closingBanner(data)} onOpen={() => setClosingOpen(true)} />
          <SummaryTiles tiles={wealth.tiles} />
          <EvolutionChart {...wealth.chart} />
          <AllocationCard allocation={wealth.allocation} grouping={grouping} onGroupingChange={setGrouping} />
          <AssetsTable
            groups={wealth.groups}
            showDaily={!calm}
            hasUnavailableQuote={wealth.hasUnavailableQuote}
            invested={wealth.invested}
            total={wealth.total}
            onNew={openNewAsset}
            onEdit={(asset) => setFormTarget({ id: asset.id, draft: draftFromAsset(asset) })}
          />
          <AssetFormSheet
            target={formTarget}
            institutions={wealth.institutions}
            today={today}
            onClose={() => setFormTarget(null)}
          />
          <ClosingDialog
            wealth={data}
            today={today}
            open={closingOpen}
            onClose={() => setClosingOpen(false)}
          />
        </>
      )}
    </div>
  );
}

function ClosingBanner({ banner, onOpen }: { banner: ClosingBannerView; onOpen: () => void }) {
  if (!banner) return null;
  if (banner.kind === 'waiting') {
    return <p className="m-0 rounded-xl border bg-card px-4 py-3 text-sm text-icon">{banner.label}</p>;
  }
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-settlement-bg px-4 py-3.5 text-info-text"
    >
      <span className="flex flex-[1_1_360px] flex-col gap-0.5">
        <span className="font-semibold">{banner.title}</span>
        <span className="text-sm">
          Uma vez por mês: confira os valores manuais e informe aportes ou resgates. As cotações automáticas
          já estão em dia.
        </span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 rounded-[10px] bg-settlement px-4 font-semibold text-white hover:bg-settlement/90"
      >
        Fazer fechamento
      </button>
    </div>
  );
}

function CalmToggle({ calm, onToggle }: { calm: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={calm}
      onClick={onToggle}
      className="flex min-h-11 items-center gap-2.5 rounded-[10px] border bg-card py-1 pr-3.5 pl-2.5 text-left text-ink hover:bg-accent"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-[22px] w-9 flex-none items-center rounded-full p-0.5',
          calm ? 'justify-end bg-chart-income' : 'justify-start bg-input',
        )}
      >
        <span className="size-[18px] rounded-full bg-white" />
      </span>
      <span className="flex flex-col leading-[1.2]">
        <span className="text-sm font-semibold">Modo tranquilo</span>
        <span className="text-xs text-muted-foreground">
          {calm ? 'Variações diárias ocultas' : 'Mostrando variações do dia'}
        </span>
      </span>
    </button>
  );
}
