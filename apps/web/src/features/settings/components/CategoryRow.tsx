import { toPaletteColor, validateCategoryName, type Category } from '@livro-caixa/domain';
import { Pencil, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { isUnauthorized } from '@/shared/api/query-client';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { useDeleteCategory, useUpdateCategory } from '../api';
import { usageLabel } from '../view-model';
import { ColorSwatches } from './ColorSwatches';

interface CategoryRowProps {
  category: Category;
  categories: Category[];
  usage: number;
  editing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
}

export function CategoryRow({
  category,
  categories,
  usage,
  editing,
  onEdit,
  onDoneEditing,
}: CategoryRowProps) {
  return (
    <div className="flex min-h-[60px] flex-col justify-center border-b border-divider px-5 py-2.5 last:border-b-0">
      {editing ? (
        <CategoryEditor category={category} categories={categories} onDone={onDoneEditing} />
      ) : (
        <CategoryView category={category} usage={usage} onEdit={onEdit} />
      )}
    </div>
  );
}

function CategoryView({
  category,
  usage,
  onEdit,
}: {
  category: Category;
  usage: number;
  onEdit: () => void;
}) {
  const l10n = usePreferences();
  const { t } = l10n;
  const remove = useDeleteCategory();
  const inUse = usage > 0;
  const deleteLabel = inUse ? t('category.inUse', category.name) : t('settings.delete', category.name);

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="size-3.5 flex-none rounded"
        style={{ backgroundColor: category.color }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{category.name}</span>
        <span className="text-[13px] text-muted-foreground">{usageLabel(usage, l10n)}</span>
      </div>
      <button
        type="button"
        aria-label={t('settings.edit', category.name)}
        onClick={onEdit}
        className="flex size-10 items-center justify-center rounded-lg text-icon hover:bg-background"
      >
        <Pencil className="size-[17px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        title={deleteLabel}
        disabled={inUse || remove.isPending}
        onClick={() => remove.mutate(category)}
        className={cn(
          'flex size-10 items-center justify-center rounded-lg',
          inUse ? 'cursor-not-allowed text-disabled-text' : 'text-expense hover:bg-expense-row',
        )}
      >
        <Trash2 className="size-[17px]" aria-hidden="true" />
      </button>
    </div>
  );
}

interface CategoryEditorProps {
  category: Category;
  categories: Category[];
  onDone: () => void;
}

function CategoryEditor({ category, categories, onDone }: CategoryEditorProps) {
  const { t } = usePreferences();
  const nameId = useId();
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(toPaletteColor(category.color));
  const [error, setError] = useState('');
  const update = useUpdateCategory();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateCategoryName(name, category.type, categories, t, category.id);
    if (invalid) {
      setError(invalid);
      return;
    }
    update.mutate(
      { id: category.id, patch: { name: name.trim(), color } },
      {
        onSuccess: onDone,
        onError: (failure) => {
          if (!isUnauthorized(failure)) setError(failure.message);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-center gap-2.5 py-1">
      <div className="flex flex-[1_1_180px] flex-col gap-1">
        <label htmlFor={nameId} className="text-[13px] font-semibold text-muted-foreground">
          {t('settings.name')}
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          className="h-10 rounded-lg border border-input bg-card px-2.5 font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      <ColorSwatches label={t('settings.categoryColor')} value={color} onChange={setColor} size="sm" />
      <div className="ml-auto flex gap-1.5">
        <button
          type="button"
          onClick={onDone}
          className="min-h-10 rounded-lg border bg-card px-3 text-sm font-semibold text-ink"
        >
          {t('settings.cancel')}
        </button>
        <button
          type="submit"
          disabled={update.isPending}
          className="min-h-10 rounded-lg bg-ink px-3 text-sm font-semibold text-white disabled:bg-icon"
        >
          {t('settings.save')}
        </button>
      </div>
      {error && (
        <span role="alert" className="basis-full text-sm font-semibold text-expense">
          {error}
        </span>
      )}
    </form>
  );
}
