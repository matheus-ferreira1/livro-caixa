import {
  ASSET_CLASSES,
  assetClassLabel,
  draftToAssetInput,
  QUOTED_ASSET_CLASSES,
  type AssetDraft,
  type IsoDate,
  type MessageKey,
  type PricingMode,
} from '@livro-caixa/domain';
import { X } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/shared/ui/sheet';
import { useSaveAsset } from '../api';

const PRICING_OPTIONS = [
  { key: 'auto', label: 'wealth.form.pricingAuto', hint: 'wealth.form.pricingAutoHint' },
  { key: 'manual', label: 'wealth.form.pricingManual', hint: 'wealth.form.pricingManualHint' },
] as const satisfies readonly { key: PricingMode; label: MessageKey; hint: MessageKey }[];

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
  const l10n = usePreferences();
  const { t, money } = l10n;
  const isEdit = target.id !== null;
  const save = useSaveAsset();
  const [error, setError] = useState('');
  const { register, watch, setValue, handleSubmit } = useForm<AssetDraft>({ defaultValues: target.draft });
  const pricing = watch('pricing');
  const assetClass = watch('assetClass');
  const institution = watch('institution');
  const emptyAmount = money.toInput(0);
  const clearError = () => setError('');

  const submit = handleSubmit((draft) => {
    const result = draftToAssetInput(draft, today, l10n);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    save.mutate(
      { id: target.id, input: result.input },
      {
        onSuccess: () => {
          toast(isEdit ? t('wealth.form.updated') : t('wealth.form.added'));
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : t('wealth.form.saveFailed')),
      },
    );
  });

  return (
    <form onSubmit={submit} onChange={clearError} noValidate className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-5">
        <SheetTitle className="m-0 text-xl font-bold">
          {isEdit ? t('wealth.form.titleEdit') : t('wealth.newAsset')}
        </SheetTitle>
        <SheetDescription className="sr-only">{t('wealth.form.description')}</SheetDescription>
        <SheetClose
          aria-label={t('common.close')}
          className="flex size-11 items-center justify-center rounded-[10px] bg-background text-ink hover:bg-track"
        >
          <X className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        </SheetClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-col gap-2">
          <Field
            label={t('wealth.form.institution')}
            placeholder={t('wealth.form.institutionPlaceholder')}
            {...register('institution')}
          />
          {institutions.length > 0 && (
            <div role="group" aria-label={t('wealth.form.usedInstitutions')} className="flex flex-wrap gap-2">
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

        <Field
          label={t('wealth.form.name')}
          placeholder={t('wealth.form.namePlaceholder')}
          {...register('name')}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t('wealth.form.class')}</span>
          <div role="group" aria-label={t('wealth.form.classGroup')} className="flex flex-wrap gap-2">
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
                {assetClassLabel(c.key, t)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t('wealth.form.howUpdated')}</span>
          <div role="group" aria-label={t('wealth.form.updateType')} className="grid grid-cols-2 gap-2">
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
                <span className="text-sm font-semibold">{t(label)}</span>
                <span className="text-xs text-muted-foreground">{t(hint)}</span>
              </button>
            ))}
          </div>
        </div>

        {pricing === 'auto' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('wealth.form.quantity')}
              placeholder="0"
              inputMode="decimal"
              amount
              {...register('quantity')}
            />
            <Field
              label={t('wealth.form.avgPrice', money.symbol)}
              placeholder={emptyAmount}
              inputMode="decimal"
              amount
              {...register('avgPrice')}
            />
            <div className="col-span-2">
              <Field
                label={t('wealth.form.currentQuote', money.symbol)}
                placeholder={emptyAmount}
                inputMode="decimal"
                amount
                hint={
                  QUOTED_ASSET_CLASSES.includes(assetClass)
                    ? t('wealth.form.quotedHint')
                    : t('wealth.form.unquotedHint')
                }
                {...register('price')}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('wealth.form.invested', money.symbol)}
              placeholder={emptyAmount}
              inputMode="decimal"
              amount
              {...register('invested')}
            />
            <Field
              label={t('wealth.form.currentValue', money.symbol)}
              placeholder={emptyAmount}
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
          {t('wealth.cancel')}
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="min-h-11 rounded-[10px] bg-ink px-5 font-semibold text-white disabled:bg-icon"
        >
          {isEdit ? t('wealth.form.save') : t('wealth.form.add')}
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
