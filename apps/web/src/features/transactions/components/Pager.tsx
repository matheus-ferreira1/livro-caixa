import { pageList, PAGE_SIZES } from '@livro-caixa/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Segmented } from '@/shared/Segmented';

interface PagerProps {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

const SIZE_OPTIONS = PAGE_SIZES.map((size) => [String(size), String(size)] as const);

export function Pager({ page, totalPages, start, end, total, pageSize, onPage, onPageSize }: PagerProps) {
  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t bg-muted px-5 py-3 text-sm text-muted-foreground"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span role="status">{total ? `Mostrando ${start}–${end} de ${total}` : 'Nenhum resultado'}</span>
        <Segmented
          label="Itens por página"
          size="sm"
          value={String(pageSize)}
          options={SIZE_OPTIONS}
          onChange={(v) => onPageSize(Number(v))}
          className="rounded-[10px]"
        />
        <span className="text-[13px]">por página</span>
      </div>
      <div className="flex items-center gap-1">
        <PagerArrow label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </PagerArrow>
        {pageList(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="min-w-6 text-center">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'h-10 min-w-10 rounded-lg border px-2 font-mono text-sm font-semibold',
                p === page ? 'border-ink bg-ink text-white' : 'bg-card text-ink',
              )}
            >
              {p}
            </button>
          ),
        )}
        <PagerArrow label="Próxima página" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </PagerArrow>
      </div>
    </nav>
  );
}

function PagerArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-lg border bg-card text-ink disabled:cursor-default disabled:text-disabled-text"
    >
      {children}
    </button>
  );
}
