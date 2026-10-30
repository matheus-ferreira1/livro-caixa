import {
  CATEGORY_PALETTE,
  CATEGORY_TYPES,
  categoriesOfType,
  validateCategoryName,
  type Category,
  type CategoryColor,
  type CategoryType,
  type CategoryUsage,
} from '@livro-caixa/domain';
import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Segmented } from '@/shared/Segmented';
import { isUnauthorized } from '@/shared/api/query-client';
import { cn } from '@/shared/lib/utils';
import { useCreateCategory } from '../api';
import { categoryCountLabel } from '../view-model';
import { CategoryRow } from './CategoryRow';
import { ColorSwatches } from './ColorSwatches';

const TYPE_OPTIONS = [
  ['receita', 'Receita'],
  ['despesa', 'Despesa'],
] as const;

const LIST_META: Record<CategoryType, { title: string; dot: string }> = {
  receita: { title: 'Receitas', dot: 'bg-income' },
  despesa: { title: 'Despesas', dot: 'bg-expense' },
};

export const settingsInputClass =
  'h-11 rounded-[10px] border border-input bg-card px-3 font-normal text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

interface CategoriesSectionProps {
  categories: Category[];
  usage: CategoryUsage;
}

export function CategoriesSection({ categories, usage }: CategoriesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section aria-labelledby="categories-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="categories-title" className="m-0 text-xl font-bold">
          Categorias
        </h2>
        <p className="m-0 max-w-[640px] text-muted-foreground">
          Categorias organizam receitas e despesas. Acertos não usam categoria. Uma categoria em uso não pode
          ser excluída, só renomeada.
        </p>
      </div>
      <NewCategoryForm categories={categories} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-start gap-4">
        {CATEGORY_TYPES.map((type) => {
          const items = categoriesOfType(categories, type);
          const titleId = `categories-${type}`;
          return (
            <section
              key={type}
              aria-labelledby={titleId}
              className="overflow-hidden rounded-[14px] border bg-card"
            >
              <div className="flex items-center justify-between gap-3 border-b bg-muted px-5 py-3.5">
                <h3 id={titleId} className="m-0 flex items-center gap-2 text-base font-bold">
                  <span aria-hidden="true" className={cn('size-2 rounded-full', LIST_META[type].dot)} />
                  {LIST_META[type].title}
                </h3>
                <span className="text-[13px] text-muted-foreground">{categoryCountLabel(items.length)}</span>
              </div>
              {items.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  categories={categories}
                  usage={usage[category.id] ?? 0}
                  editing={editingId === category.id}
                  onEdit={() => setEditingId(category.id)}
                  onDoneEditing={() => setEditingId(null)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function NewCategoryForm({ categories }: { categories: Category[] }) {
  const nameId = useId();
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('despesa');
  const [color, setColor] = useState<CategoryColor>(CATEGORY_PALETTE[0]);
  const [error, setError] = useState('');
  const create = useCreateCategory();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateCategoryName(name, type, categories);
    if (invalid) {
      setError(invalid);
      return;
    }
    create.mutate(
      { name: name.trim(), type, color },
      {
        onSuccess: () => setName(''),
        onError: (failure) => {
          if (!isUnauthorized(failure)) setError(failure.message);
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-wrap items-end gap-4 rounded-[14px] border bg-card p-5"
    >
      <div className="flex flex-[1_1_260px] flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm font-semibold">
          Nova categoria
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="Ex.: Pets, Academia, Gás"
          className={settingsInputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Tipo</span>
        <Segmented label="Tipo da nova categoria" value={type} options={TYPE_OPTIONS} onChange={setType} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Cor</span>
        <div className="flex min-h-11 items-center">
          <ColorSwatches label="Cor da nova categoria" value={color} onChange={setColor} />
        </div>
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-[18px] font-semibold text-white disabled:bg-icon"
      >
        <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        Adicionar
      </button>
      {error && (
        <span role="alert" className="basis-full text-sm font-semibold text-expense">
          {error}
        </span>
      )}
    </form>
  );
}
