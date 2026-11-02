import type { SummaryStatus } from '@livro-caixa/domain';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { SummaryMonthRow, SummaryViewModel } from '../view-model';

const HEADER_CELL = 'px-1.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase';
const AMOUNT_CELL = 'px-1.5 text-right whitespace-nowrap';
// The padding on the first and last cells makes the row's 20px inset, on top of the 6px cell gap.
const FIRST_CELL = 'pr-1.5 pl-5 text-left font-sans text-[15px]';

const STATUS_CLASSES: Record<SummaryStatus, string> = {
  empty: 'border-solid border-border text-muted-foreground',
  open: 'border-dashed border-pending-border bg-pending-bg text-pending',
  closed: 'border-solid border-income-border bg-income-bg text-income',
};

const BALANCE_CLASSES: Record<SummaryMonthRow['balanceTone'], string> = {
  muted: 'text-muted-foreground',
  income: 'text-income',
  expense: 'text-expense',
};

const AMOUNT_COLUMNS = ['Receitas', 'Despesas', 'Acertos', 'Balanço'];

export function SummaryTable({
  year,
  months,
  totals,
}: {
  year: number;
  months: SummaryMonthRow[];
  totals: SummaryViewModel['totals'];
}) {
  return (
    <section aria-label="Tabela do resumo mensal" className="overflow-hidden rounded-[14px] border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1140px] table-fixed border-collapse font-mono text-sm">
          <colgroup>
            <col className="w-[176px]" />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
            <col />
            <col className="w-[144px]" />
            <col className="w-[72px]" />
          </colgroup>
          <thead>
            <tr className="h-11 border-b bg-muted font-sans">
              <th scope="col" className={cn(HEADER_CELL, 'pl-5 text-left')}>
                Mês
              </th>
              {AMOUNT_COLUMNS.map((label) => (
                <th key={label} scope="col" className={cn(HEADER_CELL, 'text-right')}>
                  {label}
                </th>
              ))}
              <th scope="col" className={cn(HEADER_CELL, 'text-left')}>
                Acumulado
              </th>
              <th scope="col" className={cn(HEADER_CELL, 'text-left')}>
                Situação
              </th>
              <td />
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <MonthRow key={m.month} month={m} />
            ))}
          </tbody>
          <tfoot>
            <tr className="h-14 bg-muted font-semibold">
              <th scope="row" className={cn(FIRST_CELL, 'font-bold')}>
                Total {year}
              </th>
              <td className={cn(AMOUNT_CELL, 'text-income')}>{totals.income}</td>
              <td className={cn(AMOUNT_CELL, 'text-expense')}>{totals.expense}</td>
              <td className={cn(AMOUNT_CELL, 'text-settlement')}>{totals.settlement}</td>
              <td className={cn(AMOUNT_CELL, BALANCE_CLASSES[totals.balanceTone])}>{totals.balance}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function MonthRow({ month: m }: { month: SummaryMonthRow }) {
  const cellColor = m.hasData ? undefined : 'text-muted-foreground';
  return (
    <tr className={cn('h-14 border-b border-divider', m.isCurrent && 'bg-current-row')}>
      <th scope="row" className={cn(FIRST_CELL, 'font-semibold')}>
        <span className="flex items-center gap-2">
          {m.name}
          {m.isCurrent && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em] text-white uppercase">
              Atual
            </span>
          )}
        </span>
      </th>
      <td className={cn(AMOUNT_CELL, cellColor)}>{m.income}</td>
      <td className={cn(AMOUNT_CELL, cellColor)}>{m.expense}</td>
      <td className={cn(AMOUNT_CELL, m.hasSettlement ? 'text-settlement' : 'text-muted-foreground')}>
        {m.settlement}
      </td>
      <td className={cn(AMOUNT_CELL, 'font-semibold', BALANCE_CLASSES[m.balanceTone])}>{m.balance}</td>
      <td className="px-1.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="flex h-2 flex-1 overflow-hidden rounded-full bg-divider">
            <span
              className={cn('rounded-full', m.accumulatedNegative ? 'bg-deficit' : 'bg-accumulated')}
              style={{ width: m.accumulatedWidth }}
            />
          </span>
          <span
            className={cn(
              'min-w-28 text-right font-semibold whitespace-nowrap',
              !m.hasAccumulated && 'text-muted-foreground',
              m.accumulatedNegative && 'text-expense',
            )}
          >
            {m.accumulated}
          </span>
        </span>
      </td>
      <td className="px-1.5">
        <span
          className={cn(
            'inline-block rounded-full border px-2.5 py-[3px] font-sans text-[13px] font-semibold whitespace-nowrap',
            STATUS_CLASSES[m.statusTone],
          )}
        >
          {m.statusLabel}
        </span>
      </td>
      <td className="pr-3">
        <Link
          to={m.href}
          aria-label={m.openLabel}
          title={m.openLabel}
          className="flex size-11 items-center justify-center rounded-lg text-icon hover:bg-accent"
        >
          <ChevronRight className="size-[17px]" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}
