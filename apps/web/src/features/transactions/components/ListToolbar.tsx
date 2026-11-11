import type { StatusFilter, TypeFilter } from '@livro-caixa/domain';
import { Search } from 'lucide-react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { Segmented } from '@/shared/Segmented';

const TYPE_OPTIONS = [
  ['all', 'transactions.typeAll'],
  ['receita', 'transactions.typeIncome'],
  ['despesa', 'transactions.typeExpense'],
  ['acerto', 'transactions.typeSettlement'],
] as const;

const STATUS_OPTIONS = [
  ['all', 'transactions.statusAll'],
  ['confirmed', 'transactions.statusConfirmed'],
  ['pending', 'transactions.statusPending'],
] as const;

interface ListToolbarProps {
  type: TypeFilter;
  status: StatusFilter;
  query: string;
  onChange: (patch: { type?: TypeFilter; status?: StatusFilter; query?: string }) => void;
}

export function ListToolbar({ type, status, query, onChange }: ListToolbarProps) {
  const { t } = usePreferences();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-3">
        <Segmented
          label={t('transactions.filterType')}
          value={type}
          options={TYPE_OPTIONS.map(([value, key]) => [value, t(key)] as const)}
          onChange={(v) => onChange({ type: v })}
        />
        <Segmented
          label={t('transactions.filterStatus')}
          value={status}
          options={STATUS_OPTIONS.map(([value, key]) => [value, t(key)] as const)}
          onChange={(v) => onChange({ status: v })}
        />
      </div>
      <label className="flex min-h-11 min-w-[220px] flex-[0_1_340px] items-center gap-2 rounded-[10px] border bg-card px-3.5 text-muted-foreground focus-within:ring-[3px] focus-within:ring-ring/50">
        <Search className="size-[18px] flex-none" aria-hidden="true" />
        <span className="sr-only">{t('transactions.searchLabel')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder={t('transactions.searchPlaceholder')}
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-muted-foreground"
        />
      </label>
    </div>
  );
}
