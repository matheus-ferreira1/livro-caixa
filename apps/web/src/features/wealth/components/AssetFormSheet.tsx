import {
  ASSET_CLASSES,
  draftToAssetInput,
  type AssetDraft,
  type IsoDate,
  type PricingMode,
} from '@livro-caixa/domain';
import { X } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/shared/ui/sheet';
import { useSaveAsset } from '../api';

const PRICING_OPTIONS: readonly { key: PricingMode; label: string; hint: string }[] = [
  { key: 'auto', label: 'Cotação automática', hint: 'Ações, FIIs, ETFs, cripto e moedas' },
  { key: 'manual', label: 'Manual, no fechamento', hint: 'Tesouro, caixinhas, CDB, saldos' },
];

const INPUT_CLASS =
  'h-11 w-full rounded-[10px] border border-input bg-card px-3 font-normal text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
const AMOUNT_CLASS = 'text-right font-mono text-[15px] font-medium';

const pickClass = (active: boolean) => (active ? 'border-ink bg-accent' : 'border-border bg-card');

export interface AssetFormTarget {
  /** null creates a new asset. */
  id: string | null;
  draft: AssetDraft;
}

interface AssetFormSheetProps {
  target: AssetFormTarget | null;
  institutions: string[];
  today: IsoDate;
  onClose: () => void;
}

export function AssetFormSheet({ target, onClose, ...rest }: AssetFormSheetProps) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-l-0 bg-card shadow-[-12px_0_40px_rgba(23,32,28,0.18)] sm:max-w-[480px]"
      >
        {/* Remount per target so the form starts from that asset's values. */}
        {target && <AssetForm key={target.id ?? 'new'} target={target} onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  );
}

function AssetForm({
  target,
  institutions,
  today,
  onClose,
}: Omit<AssetFormSheetProps, 'target'> & { target: AssetFormTarget }) {
  const isEdit = target.id !== null;
  const save = useSaveAsset();
  const [error, setError] = useState('');
  const { register, watch, setValue, handleSubmit } = useForm<AssetDraft>({ defaultValues: target.draft });
  const pricing = watch('pricing');
  const assetClass = watch('assetClass');
  const institution = watch('institution');
  const clearError = () => setError('');

  const submit = handleSubmit((draft) => {
    const result = draftToAssetInput(draft, today);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    save.mutate(
      { id: target.id, input: result.input },
      {
        onSuccess: () => {
          toast(isEdit ? 'Ativo atualizado' : 'Ativo adicionado à carteira');
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.'),
      },
    );
  });

  return (
    <form onSubmit={submit} onChange={clearError} noValidate className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-5">
        <SheetTitle className="m-0 text-xl font-bold">{isEdit ? 'Editar ativo' : 'Novo ativo'}</SheetTitle>
        <SheetDescription className="sr-only">Preencha os dados do ativo.</SheetDescription>
        <SheetClose
          aria-label="Fechar"
          className="flex size-11 items-center justify-center rounded-[10px] bg-background text-ink hover:bg-track"
        >
          <X className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        </SheetClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-col gap-2">
          <Field
            label="Banco ou corretora"
            placeholder="Ex.: XP, Nubank, Binance"
            {...register('institution')}
          />
          {institutions.length > 0 && (
            <div role="group" aria-label="Instituições já usadas" className="flex flex-wrap gap-2">
              {institutions.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={institution.trim().toLowerCase() === name.toLowerCase()}
                  onClick={() => {
                    setValue('institution', name);
                    clearError();
                  }}
                  className={cn(
                    'min-h-11 rounded-full border-[1.5px] px-3 text-sm font-semibold text-ink',
                    pickClass(institution.trim().toLowerCase() === name.toLowerCase()),
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Field label="Ativo" placeholder="Ex.: Tesouro Selic 2029, PETR4, BTC-BRL" {...register('name')} />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Classe</span>
          <div role="group" aria-label="Classe do ativo" className="flex flex-wrap gap-2">
            {ASSET_CLASSES.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={assetClass === c.key}
                onClick={() => {
                  setValue('assetClass', c.key);
                  clearError();
                }}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-semibold text-ink',
                  pickClass(assetClass === c.key),
                )}
              >
                <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Como o valor é atualizado</span>
          <div role="group" aria-label="Tipo de atualização" className="grid grid-cols-2 gap-2">
            {PRICING_OPTIONS.map(({ key, label, hint }) => (
              <button
                key={key}
                type="button"
                aria-pressed={pricing === key}
                onClick={() => {
                  setValue('pricing', key);
                  clearError();
                }}
                className={cn(
                  'flex min-h-11 flex-col gap-0.5 rounded-[10px] border-[1.5px] px-3 py-2.5 text-left text-ink',
                  pickClass(pricing === key),
                )}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {pricing === 'auto' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade" placeholder="0" inputMode="decimal" amount {...register('quantity')} />
            <Field
              label="Preço médio (R$)"
              placeholder="0,00"
              inputMode="decimal"
              amount
              {...register('avgPrice')}
            />
            <div className="col-span-2">
              <Field
                label="Cotação atual (R$)"
                placeholder="0,00"
                inputMode="decimal"
                amount
                hint="Preenchida pela cotação automática pelo ticker. Edite só se a cotação não for encontrada."
                {...register('price')}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Valor aplicado (R$)"
              placeholder="0,00"
              inputMode="decimal"
              amount
              {...register('invested')}
            />
            <Field
              label="Valor atual (R$)"
              placeholder="0,00"
              inputMode="decimal"
              amount
              {...register('current')}
            />
          </div>
        )}

        {error && (
          <span role="alert" className="text-sm font-semibold text-expense">
            {error}
          </span>
        )}
      </div>

      <div className="flex justify-end gap-2.5 border-t bg-muted px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-[10px] border bg-card px-[18px] font-semibold text-ink"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="min-h-11 rounded-[10px] bg-ink px-5 font-semibold text-white disabled:bg-icon"
        >
          {isEdit ? 'Salvar alterações' : 'Adicionar ativo'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  amount,
  hint,
  ref,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  amount?: boolean;
  hint?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        type="text"
        {...inputProps}
        className={cn(INPUT_CLASS, amount && AMOUNT_CLASS)}
      />
      {hint && <span className="text-[12.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
