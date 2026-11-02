import {
  computeSettlement,
  displayPartnerName,
  settlementEntry,
  type Category,
  type MonthKey,
} from '@livro-caixa/domain';
import { Copy, MessageCircle } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useCategories, useSettings } from '@/features/settings/api';
import { showError, useMonthTransactions, useSaveTransaction } from '@/features/transactions/api';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogContent, DialogTitleBar } from '@/shared/ui/dialog';
import { settlementViewModel, type SettlementViewModel } from './view-model';

const COPIED_FEEDBACK_MS = 3_000;

// Header and rows share fixed money columns so they line up; narrower on phones.
const ITEM_GRID =
  'grid grid-cols-[minmax(0,1fr)_88px_88px] gap-2 sm:grid-cols-[minmax(0,1fr)_112px_112px] sm:gap-3';

type CopyState = 'idle' | 'copied' | 'failed';

interface SettlementDialogProps {
  month: MonthKey;
  open: boolean;
  onClose: () => void;
}

export function SettlementDialog({ month, open, onClose }: SettlementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[1000px]">
        {/* Remount on every open so the checkbox and copy state start fresh, as in the design. */}
        {open && <SettlementContent month={month} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SettlementContent({ month, onClose }: Omit<SettlementDialogProps, 'open'>) {
  const { data: transactions = [] } = useMonthTransactions(month, true);
  const { data: categories = [] } = useCategories();
  const { data: settings } = useSettings();
  const save = useSaveTransaction();
  const [includePending, setIncludePending] = useState(true);
  const partnerName = settings ? displayPartnerName(settings) : '';

  const settlement = useMemo(
    () => computeSettlement(transactions, settings?.partnerShare ?? 0, { includePending }),
    [transactions, settings?.partnerShare, includePending],
  );
  const categoryMap = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );
  const vm = settlementViewModel(settlement, { month, partnerName, categories: categoryMap, includePending });

  const register = () =>
    save.mutate(
      { id: null, input: settlementEntry(settlement, { month, partnerName }) },
      {
        onSuccess: () => {
          toast('Acerto registrado como previsto. Confirme quando receber.');
          onClose();
        },
        onError: showError,
      },
    );

  return (
    <>
      <DialogTitleBar
        title="Acerto de contas"
        description={`${vm.monthLabel} · contas divididas com ${partnerName}`}
      />

      <div className="flex flex-wrap gap-6 p-4 sm:p-6">
        <PrintSummary vm={vm} partnerName={partnerName} />
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <IncludePendingOption checked={includePending} onChange={setIncludePending} />
          <ShareMessage vm={vm} />
          <div className="flex flex-col gap-2 rounded-xl bg-settlement-bg p-4 text-info-text">
            <span className="font-semibold">Quando {partnerName} enviar o valor</span>
            <span className="text-[13px]">
              Registre o acerto como previsto agora e marque como confirmado quando o dinheiro cair.
            </span>
            <button
              type="button"
              onClick={register}
              disabled={vm.register.disabled || save.isPending}
              className="min-h-11 rounded-[10px] bg-settlement px-4 font-semibold text-white hover:bg-settlement/90 disabled:cursor-not-allowed disabled:bg-[#9AA8CF]"
            >
              {vm.register.label}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PrintSummary({ vm, partnerName }: { vm: SettlementViewModel; partnerName: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-2.5">
      <SectionLabel>Resumo para print</SectionLabel>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-1 bg-ink px-4 sm:px-[22px] py-5 text-background">
          <span className="text-xs font-semibold tracking-[0.1em] text-mint uppercase">
            Acerto · {vm.monthLabel}
          </span>
          <span className="text-sm text-on-dark-muted">Valor a acertar por {partnerName}</span>
          <span className="font-mono text-[34px] font-semibold tracking-[-0.02em]">{vm.balance}</span>
        </div>
        <div className="px-4 sm:px-[22px] pt-2 pb-1">
          <div
            className={`${ITEM_GRID} border-b py-2.5 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.06em]`}
          >
            <span>Conta</span>
            <span className="text-right">Total</span>
            <span className="text-right">Parte {partnerName}</span>
          </div>
          {vm.items.map((item) => (
            <div key={item.id} className={`${ITEM_GRID} items-center border-b border-divider py-2.5 text-sm`}>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{item.description}</span>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </span>
              <span className="text-right font-mono text-[13px] sm:text-sm">{item.total}</span>
              <span className="text-right font-mono text-[13px] font-semibold text-settlement sm:text-sm">
                {item.partner}
              </span>
            </div>
          ))}
          {vm.items.length === 0 && (
            <p className="m-0 py-6 text-center text-muted-foreground">Nenhuma conta dividida neste mês.</p>
          )}
          <dl className="m-0 flex flex-col gap-2 pt-3.5 pb-[18px] text-sm">
            <TotalLine label="Total das contas divididas" value={vm.total} strong />
            <TotalLine label={vm.mineLabel} value={vm.mine} muted />
            <TotalLine label={vm.partnerLabel} value={vm.partner} strong accent />
            {vm.deductions.map((d) => (
              <TotalLine key={d.label} label={d.label} value={d.value} muted />
            ))}
          </dl>
        </div>
        <div className="border-t bg-muted px-4 sm:px-[22px] py-3 text-xs text-muted-foreground">
          {vm.footnote}
        </div>
      </div>
    </div>
  );
}

function TotalLine({
  label,
  value,
  strong = false,
  muted = false,
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${muted ? 'text-muted-foreground' : ''}`}>
      <dt>{label}</dt>
      <dd className={`m-0 font-mono ${strong ? 'font-semibold' : ''} ${accent ? 'text-settlement' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function IncludePendingOption({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card px-4 py-3.5"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="mt-0.5 size-5 flex-none border-input data-[state=checked]:border-ink data-[state=checked]:bg-ink"
      />
      <span className="flex flex-col gap-0.5">
        <span id={`${id}-title`} className="font-semibold">
          Incluir contas previstas
        </span>
        <span id={`${id}-description`} className="text-[13px] text-muted-foreground">
          Útil para avisar o valor antes de todas as contas vencerem.
        </span>
      </span>
    </label>
  );
}

function ShareMessage({ vm }: { vm: SettlementViewModel }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyState]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(vm.shareText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const outlineButton =
    'flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-input bg-card px-3.5 font-semibold text-ink hover:bg-accent';

  return (
    <>
      <div className="flex flex-col gap-2">
        <SectionLabel>Mensagem em texto</SectionLabel>
        <pre className="m-0 max-h-[300px] overflow-auto rounded-xl border bg-card px-4 py-3.5 font-mono text-[12.5px] leading-[1.55] whitespace-pre-wrap text-ink">
          {vm.shareText}
        </pre>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => void copy()} className={outlineButton}>
          <Copy className="size-[17px]" aria-hidden="true" />
          {copyState === 'copied' ? 'Copiado!' : 'Copiar texto'}
        </button>
        <a href={vm.whatsappUrl} target="_blank" rel="noopener noreferrer" className={outlineButton}>
          <MessageCircle className="size-[17px]" aria-hidden="true" />
          Enviar no WhatsApp
        </a>
      </div>
      {copyState === 'failed' && (
        <span role="status" className="text-[13px] text-pending">
          Não foi possível copiar automaticamente. Selecione o texto acima e copie.
        </span>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}
