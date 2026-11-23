import {
  CATEGORY_PALETTE,
  CATEGORY_TYPES,
  categoriesOfType,
  searchCategories,
  validateCategoryName,
  type Category,
  type CategoryColor,
  type CategoryType,
  type CategoryUsage,
  type MessageKey,
} from '@livro-caixa/domain';
import { Plus, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Segmented } from '@/shared/Segmented';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { isUnauthorized } from '@/shared/api/query-client';
import { cn } from '@/shared/lib/utils';
import { useCreateCategory } from '../api';
import { CATEGORY_LIST_ROWS, categoryCountLabel, showCategorySearch } from '../view-model';
import { CategoryRow } from './CategoryRow';
import { ColorSwatches } from './ColorSwatches';

const TYPE_OPTIONS = [
  ['receita', 'settings.typeIncome'],
  ['despesa', 'settings.typeExpense'],
] as const satisfies readonly (readonly [CategoryType, MessageKey])[];

const LIST_META: Record<CategoryType, { title: MessageKey; region: MessageKey; dot: string }> = {
  receita: { title: 'settings.listIncome', region: 'settings.listRegionIncome', dot: 'bg-income' },
  despesa: { title: 'settings.listExpense', region: 'settings.listRegionExpense', dot: 'bg-expense' },
};

/** Matches the `min-h-[60px]` of a `CategoryRow`. */
const CATEGORY_ROW_MIN_HEIGHT_PX = 60;

export const settingsInputClass =
  'h-11 rounded-[10px] border border-input bg-card px-3 font-normal text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

interface CategoriesSectionProps {
  categories: Category[];
  usage: CategoryUsage;
}

export function CategoriesSection({ categories, usage }: CategoriesSectionProps) {
  const { t } = usePreferences();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  const onCreated = (category: Category) => {
    setQuery('');
    setCreatedId(category.id);
  };

  return (
    <section aria-labelledby="categories-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="categories-title" className="m-0 text-xl font-bold">
          {t('settings.categoriesTitle')}
        </h2>
        <p className="m-0 max-w-[640px] text-muted-foreground">{t('settings.categoriesIntro')}</p>
      </div>
      <NewCategoryForm categories={categories} onCreated={onCreated} />
      {showCategorySearch(categories, query) && <CategorySearch value={query} onChange={setQuery} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-start gap-4">
        {CATEGORY_TYPES.map((type) => (
          <CategoryListCard
            key={type}
            type={type}
            categories={categories}
            usage={usage}
            query={query}
            editingId={editingId}
            onEditingChange={setEditingId}
            createdId={createdId}
            onCreatedShown={() => setCreatedId(null)}
          />
        ))}
      </div>
    </section>
  );
}

function CategorySearch({ value, onChange }: { value: string; onChange: (query: string) => void }) {
  const { t } = usePreferences();
  const searchId = useId();
  return (
    <div className="relative w-full max-w-[360px]">
      <label htmlFor={searchId} className="sr-only">
        {t('settings.searchCategories')}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-icon"
      />
      <input
        id={searchId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('settings.searchCategoriesPlaceholder')}
        className={cn(settingsInputClass, 'w-full pl-9')}
      />
    </div>
  );
}

interface CategoryListCardProps {
  type: CategoryType;
  categories: Category[];
  usage: CategoryUsage;
  query: string;
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  createdId: string | null;
  onCreatedShown: () => void;
}

function CategoryListCard({
  type,
  categories,
  usage,
  query,
  editingId,
  onEditingChange,
  createdId,
  onCreatedShown,
}: CategoryListCardProps) {
  const l10n = usePreferences();
  const { t } = l10n;
  const listRef = useRef<HTMLDivElement>(null);
  const items = searchCategories(categoriesOfType(categories, type), query, editingId);
  const titleId = `categories-${type}`;
  const hasCreated = createdId !== null && items.some((category) => category.id === createdId);

  useEffect(() => {
    if (!hasCreated) return;
    listRef.current?.querySelector(`[data-category-id="${createdId}"]`)?.scrollIntoView({ block: 'nearest' });
    onCreatedShown();
  }, [hasCreated, createdId, onCreatedShown]);

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted px-5 py-3.5">
        <h3 id={titleId} className="m-0 flex items-center gap-2 text-base font-bold">
          <span aria-hidden="true" className={cn('size-2 rounded-full', LIST_META[type].dot)} />
          {t(LIST_META[type].title)}
        </h3>
        <span className="text-[13px] text-muted-foreground">{categoryCountLabel(items.length, l10n)}</span>
      </div>
      {/* Focusable so keyboard users can scroll a long list; the card height never grows with it. */}
      <div
        ref={listRef}
        role="region"
        aria-label={t(LIST_META[type].region)}
        tabIndex={0}
        style={{ maxHeight: CATEGORY_LIST_ROWS * CATEGORY_ROW_MIN_HEIGHT_PX }}
        className="overflow-y-auto outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        {items.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            categories={categories}
            usage={usage[category.id] ?? 0}
            editing={editingId === category.id}
            onEdit={() => onEditingChange(category.id)}
            onDoneEditing={() => onEditingChange(null)}
          />
        ))}
        {items.length === 0 && query.trim() && (
          <p className="m-0 px-5 py-5 text-sm text-muted-foreground">
            {t('settings.noCategoryMatch', query.trim())}
          </p>
        )}
      </div>
    </section>
  );
}

interface NewCategoryFormProps {
  categories: Category[];
  onCreated: (category: Category) => void;
}

function NewCategoryForm({ categories, onCreated }: NewCategoryFormProps) {
  const { t } = usePreferences();
  const nameId = useId();
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('despesa');
  const [color, setColor] = useState<CategoryColor>(CATEGORY_PALETTE[0]);
  const [error, setError] = useState('');
  const create = useCreateCategory();
  const typeOptions = TYPE_OPTIONS.map(([value, label]) => [value, t(label)] as const);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateCategoryName(name, type, categories, t);
    if (invalid) {
      setError(invalid);
      return;
    }
    create.mutate(
      { name: name.trim(), type, color },
      {
        onSuccess: ({ category }) => {
          setName('');
          onCreated(category);
        },
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
          {t('settings.newCategory')}
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder={t('settings.newCategoryPlaceholder')}
          className={settingsInputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t('settings.type')}</span>
        <Segmented
          label={t('settings.newCategoryType')}
          value={type}
          options={typeOptions}
          onChange={setType}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t('settings.color')}</span>
        <div className="flex min-h-11 items-center">
          <ColorSwatches label={t('settings.newCategoryColor')} value={color} onChange={setColor} />
        </div>
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-[18px] font-semibold text-white disabled:bg-icon"
      >
        <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        {t('settings.add')}
      </button>
      {error && (
        <span role="alert" className="basis-full text-sm font-semibold text-expense">
          {error}
        </span>
      )}
    </form>
  );
}
