import {
  applyTypeChange,
  draftToInput,
  TRANSACTION_TYPES,
  type Category,
  type Transaction,
  type TransactionDraft,
} from '@livro-caixa/domain';
import { X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui/checkbox';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/shared/ui/sheet';
import { useSaveTransaction } from '../api';
import { TYPE_META } from '../view-model';

export interface FormTarget {
  /** null creates a new entry. */
  id: string | null;
  draft: TransactionDraft;
}

interface TransactionFormSheetProps {
  target: FormTarget | null;
  categories: Category[];
  partnerName: string;
  partnerShare: number;
  onClose: () => void;
  onSaved: (transaction: Transaction) => void;
}

export function TransactionFormSheet({ target, onClose, ...rest }: TransactionFormSheetProps) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-l-0 bg-card shadow-[-12px_0_40px_rgba(23,32,28,0.18)] sm:max-w-[480px]"
      >
        {/* Remount per target so the form starts from that entry's values. */}
        {target && <TransactionForm key={target.id ?? 'new'} target={target} onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  );
}

function TransactionForm({
  target,
  categories,
  partnerName,
  partnerShare,
  onClose,
  onSaved,
}: Omit<TransactionFormSheetProps, 'target'> & { target: FormTarget }) {
  const isEdit = target.id !== null;
  const save = useSaveTransaction();
  const [error, setError] = useState('');
  const { register, control, watch, setValue, getValues, handleSubmit } = useForm<TransactionDraft>({
    defaultValues: target.draft,
  });
  const ids = { date: useId(), value: useId(), description: useId(), note: useId() };
  const type = watch('type');
  const categoryId = watch('categoryId');
  const clearError = () => setError('');

  const submit = handleSubmit((draft) => {
    const result = draftToInput(draft);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    save.mutate(
      { id: target.id, input: result.input },
      {
        onSuccess: ({ transaction }) => {
          toast(isEdit ? 'Lançamento atualizado' : 'Lançamento adicionado');
          onSaved(transaction);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.'),
      },
    );
  });

  const pickType = (next: TransactionDraft['type']) => {
    const changed = applyTypeChange(getValues(), next, categories);
    setValue('type', changed.type);
    setValue('categoryId', changed.categoryId);
    setValue('split', changed.split);
    clearError();
  };

  const inputClass =
    'h-11 rounded-[10px] border border-input bg-card px-3 font-normal text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

  return (
    <form onSubmit={submit} onChange={clearError} noValidate className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-6 py-5">
        <SheetTitle className="m-0 text-xl font-bold">
          {isEdit ? 'Editar lançamento' : 'Novo lançamento'}
        </SheetTitle>
        <SheetDescription className="sr-only">Preencha os dados do lançamento.</SheetDescription>
        <SheetClose
          aria-label="Fechar"
          className="flex size-11 items-center justify-center rounded-[10px] bg-background text-ink hover:bg-track"
        >
          <X className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        </SheetClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Tipo</span>
          <div role="group" aria-label="Tipo do lançamento" className="grid grid-cols-3 gap-2">
            {TRANSACTION_TYPES.map((t) => {
              const meta = TYPE_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickType(t)}
                  className={cn(
                    'min-h-11 rounded-[10px] border-[1.5px] font-semibold',
                    active ? cn(meta.bg, meta.text, meta.border) : 'border-border bg-card text-icon',
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          {type === 'acerto' && (
            <span className="rounded-lg bg-settlement-bg px-3 py-2.5 text-[13px] text-info-text">
              Acerto é o valor recebido de {partnerName} referente às contas divididas do mês. Não entra como
              receita.
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id={ids.date} label="Data">
            <input id={ids.date} type="date" {...register('date')} className={inputClass} />
          </Field>
          <Field id={ids.value} label="Valor (R$)">
            <input
              id={ids.value}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...register('value')}
              className={cn(inputClass, 'text-right font-mono text-[15px] font-medium')}
            />
          </Field>
        </div>

        <Field id={ids.description} label="Descrição">
          <input
            id={ids.description}
            type="text"
            placeholder="Ex.: Conta de luz"
            {...register('description')}
            className={inputClass}
          />
        </Field>

        {type !== 'acerto' && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Categoria</span>
            <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={categoryId === c.id}
                    onClick={() => {
                      setValue('categoryId', c.id);
                      clearError();
                    }}
                    className={cn(
                      'flex min-h-10 items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-semibold text-ink',
                      categoryId === c.id ? 'border-ink bg-accent' : 'border-border bg-card',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-[3px]"
                      style={{ background: c.color }}
                    />
                    {c.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.note} className="text-sm font-semibold">
            Observação <span className="font-normal text-muted-foreground">Opcional</span>
          </label>
          <textarea
            id={ids.note}
            rows={3}
            placeholder="Ex.: leitura de 12/09 a 11/10"
            {...register('note')}
            className="resize-y rounded-[10px] border border-input bg-card px-3 py-2.5 font-normal text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border">
          {type === 'despesa' && (
            <Option
              control={control}
              name="split"
              title="Conta dividida"
              description={`Entra no cálculo do acerto com ${partnerName} (${partnerShare}% para ${partnerName}).`}
            />
          )}
          {type !== 'acerto' && (
            <Option
              control={control}
              name="recurring"
              title="Recorrente"
              description="Acontece todo mês. Será sugerido ao gerar os recorrentes do mês seguinte."
            />
          )}
          <Option
            control={control}
            name="confirmed"
            title="Confirmado"
            description="Marque quando o valor já tiver saído ou entrado. Desmarcado, fica como previsto."
          />
        </div>

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
          {isEdit ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function Option({
  control,
  name,
  title,
  description,
}: {
  control: ReturnType<typeof useForm<TransactionDraft>>['control'];
  name: 'split' | 'recurring' | 'confirmed';
  title: string;
  description: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 border-b px-4 py-3.5 last:border-b-0 hover:bg-muted"
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Checkbox
            id={id}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            className="mt-0.5 size-5 flex-none border-input data-[state=checked]:border-ink data-[state=checked]:bg-ink"
          />
        )}
      />
      <span className="flex flex-col gap-0.5">
        <span id={`${id}-title`} className="font-semibold">
          {title}
        </span>
        <span id={`${id}-description`} className="text-[13px] text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
