import type { StatusFilter, TypeFilter } from '@livro-caixa/domain';
import { Search } from 'lucide-react';
import { Segmented } from '@/shared/Segmented';

const TYPE_OPTIONS = [
  ['all', 'Todos'],
  ['receita', 'Receitas'],
  ['despesa', 'Despesas'],
  ['acerto', 'Acertos'],
] as const;

const STATUS_OPTIONS = [
  ['all', 'Todos'],
  ['confirmed', 'Confirmados'],
  ['pending', 'Previstos'],
] as const;

interface ListToolbarProps {
  type: TypeFilter;
  status: StatusFilter;
  query: string;
  onChange: (patch: { type?: TypeFilter; status?: StatusFilter; query?: string }) => void;
}

export function ListToolbar({ type, status, query, onChange }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-3">
        <Segmented
          label="Filtrar por tipo"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(v) => onChange({ type: v })}
        />
        <Segmented
          label="Filtrar por status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ status: v })}
        />
      </div>
      <label className="flex min-h-11 min-w-[220px] flex-[0_1_340px] items-center gap-2 rounded-[10px] border bg-card px-3.5 text-muted-foreground focus-within:ring-[3px] focus-within:ring-ring/50">
        <Search className="size-[18px] flex-none" aria-hidden="true" />
        <span className="sr-only">Buscar lançamentos</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Buscar descrição ou observação"
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-muted-foreground"
        />
      </label>
    </div>
  );
}
