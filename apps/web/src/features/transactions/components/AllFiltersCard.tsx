import type { Category, MessageKey, Period } from '@livro-caixa/domain';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { Segmented } from '@/shared/Segmented';
import { Toggle } from '@/shared/ui/toggle';
import { sortedCategoryChips } from '../view-model';

const PERIOD_OPTIONS = [
  ['all', 'transactions.periodAll'],
  ['year', 'transactions.periodYear'],
  ['12m', 'transactions.period12m'],
  ['custom', 'transactions.periodCustom'],
] as const satisfies readonly (readonly [Period, MessageKey])[];

interface AllFiltersCardProps {
  period: Period;
  from: string;
  to: string;
  category: string;
  categories: Category[];
  onChange: (patch: { period?: Period; from?: string; to?: string; category?: string }) => void;
}

export function AllFiltersCard({ period, from, to, category, categories, onChange }: AllFiltersCardProps) {
  const { t } = usePreferences();
  const chips: { id: string; label: string; color?: string }[] = [
    { id: 'all', label: t('transactions.categoryAll') },
    ...sortedCategoryChips(categories).map((c) => ({ id: c.id, label: c.name, color: c.color })),
    { id: 'none', label: t('transactions.categoryNone') },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <FilterLabel>{t('transactions.period')}</FilterLabel>
        <Segmented
          label={t('transactions.period')}
          size="sm"
          value={period}
          options={PERIOD_OPTIONS.map(([value, key]) => [value, t(key)] as const)}
          onChange={(v) => onChange({ period: v })}
        />
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <DateField label={t('transactions.from')} value={from} onChange={(v) => onChange({ from: v })} />
            <DateField label={t('transactions.to')} value={to} onChange={(v) => onChange({ to: v })} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2.5">
        <FilterLabel className="sm:min-h-9">{t('transactions.categoryFilter')}</FilterLabel>
        <div
          role="group"
          aria-label={t('transactions.categoryFilterGroup')}
          className="flex min-w-0 flex-1 flex-wrap gap-1.5"
        >
          {chips.map((chip) => (
            <Toggle
              key={chip.id}
              pressed={category === chip.id}
              onPressedChange={() => onChange({ category: chip.id })}
              className={cn(
                'h-9 min-w-0 gap-1.5 rounded-full border-[1.5px] bg-card px-3 text-[13px] font-semibold text-ink hover:bg-accent hover:text-ink',
                'data-[state=on]:border-ink data-[state=on]:bg-accent',
                category !== chip.id && 'border-border',
              )}
            >
              {chip.color && (
                <span
                  aria-hidden="true"
                  className="size-[9px] rounded-[3px]"
                  style={{ background: chip.color }}
                />
              )}
              {chip.label}
            </Toggle>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center max-sm:basis-full sm:min-w-[84px] text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-input bg-card px-2.5 text-sm font-normal text-ink"
      />
    </label>
  );
}
