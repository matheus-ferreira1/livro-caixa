import { draftFromAsset, emptyAssetDraft, todayIso, type WealthGrouping } from '@livro-caixa/domain';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { SummaryTiles } from '@/shared/SummaryTiles';
import { useWealth } from './api';
import { AllocationCard } from './components/AllocationCard';
import { AssetFormSheet, type AssetFormTarget } from './components/AssetFormSheet';
import { AssetsTable } from './components/AssetsTable';
import { EvolutionChart } from './components/EvolutionChart';
import { wealthViewModel } from './view-model';

export function WealthPage() {
  const today = todayIso();
  const { data } = useWealth(today);
  const [grouping, setGrouping] = useState<WealthGrouping>('class');
  const [calm, setCalm] = useState(true);
  const [formTarget, setFormTarget] = useState<AssetFormTarget | null>(null);
  const wealth = data && wealthViewModel(data, grouping, calm);
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
            </div>
          </div>

          <SummaryTiles tiles={wealth.tiles} />
          <EvolutionChart {...wealth.chart} />
          <AllocationCard allocation={wealth.allocation} grouping={grouping} onGroupingChange={setGrouping} />
          <AssetsTable
            groups={wealth.groups}
            showDaily={!calm}
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
        </>
      )}
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
