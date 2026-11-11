import type { MessageKey, SummaryStatus } from '@livro-caixa/domain';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';
import { STACKED_CELL_LABEL } from '@/shared/stacked';
import type { SummaryMonthRow, SummaryViewModel } from '../view-model';

const HEADER_CELL = 'px-1.5 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase';
const AMOUNT_CELL = cn(STACKED_CELL_LABEL, 'block whitespace-nowrap md:table-cell md:px-1.5 md:text-right');
// The padding on the first and last cells makes the row's 20px inset, on top of the 6px cell gap.
const FIRST_CELL =
  '[grid-area:1/1/2/2] md:[grid-area:auto] flex items-center text-left font-sans text-[15px] md:table-cell md:pr-1.5 md:pl-5';

/**
 * Below 768px each month stacks: its name, status and link on the first line, then the amounts in
 * two columns and the running total. The table elements stop being laid out as a table there, which
 * makes browsers drop their semantics, so every element states its role.
 */
const ROW =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 md:table-row';

/** Where each cell sits when a month is stacked, as row / column / row end / column end. */
const STACKED_AREA = {
  status: '[grid-area:1/2/2/3] md:[grid-area:auto]',
  link: '[grid-area:1/3/2/4] md:[grid-area:auto]',
  income: '[grid-area:2/1/3/2] md:[grid-area:auto]',
  expense: '[grid-area:2/2/3/4] md:[grid-area:auto]',
  settlement: '[grid-area:3/1/4/2] md:[grid-area:auto]',
  balance: '[grid-area:3/2/4/4] md:[grid-area:auto]',
  accumulated: '[grid-area:4/1/5/4] md:[grid-area:auto]',
  // A month with no amounts has no lines 2 and 3 to sit under.
  accumulatedAlone: '[grid-area:2/1/3/4] md:[grid-area:auto]',
};

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

const AMOUNT_COLUMNS = [
  'summary.colIncome',
  'summary.colExpense',
  'summary.colSettlement',
  'summary.colBalance',
] as const satisfies readonly MessageKey[];

export function SummaryTable({
  year,
  months,
  totals,
}: {
  year: number;
  months: SummaryMonthRow[];
  totals: SummaryViewModel['totals'];
}) {
  const { t } = usePreferences();
  return (
    <section aria-label={t('summary.tableLabel')} className="overflow-hidden rounded-[14px] border bg-card">
      <div className="md:overflow-x-auto">
        <table
          role="table"
          className="block w-full border-collapse font-mono text-sm md:table md:min-w-[1140px] md:table-fixed"
        >
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
          <thead role="rowgroup" className="max-md:sr-only">
            <tr role="row" className="h-11 border-b bg-muted font-sans">
              <th role="columnheader" scope="col" className={cn(HEADER_CELL, 'pl-5 text-left')}>
                {t('summary.colMonth')}
              </th>
              {AMOUNT_COLUMNS.map((label) => (
                <th key={label} role="columnheader" scope="col" className={cn(HEADER_CELL, 'text-right')}>
                  {t(label)}
                </th>
              ))}
              <th role="columnheader" scope="col" className={cn(HEADER_CELL, 'text-left')}>
                {t('summary.colAccumulated')}
              </th>
              <th role="columnheader" scope="col" className={cn(HEADER_CELL, 'text-left')}>
                {t('summary.colStatus')}
              </th>
              <td role="cell" />
            </tr>
          </thead>
          <tbody role="rowgroup" className="block md:table-row-group">
            {months.map((m) => (
              <MonthRow key={m.month} month={m} />
            ))}
          </tbody>
          <tfoot role="rowgroup" className="block md:table-footer-group">
            <tr role="row" className={cn(ROW, 'bg-muted font-semibold md:h-14')}>
              <th role="rowheader" scope="row" className={cn(FIRST_CELL, 'min-h-9 font-bold')}>
                {t('summary.total', year)}
              </th>
              <td
                role="cell"
                data-label={t('summary.colIncome')}
                className={cn(AMOUNT_CELL, STACKED_AREA.income, 'text-income')}
              >
                {totals.income}
              </td>
              <td
                role="cell"
                data-label={t('summary.colExpense')}
                className={cn(AMOUNT_CELL, STACKED_AREA.expense, 'text-expense')}
              >
                {totals.expense}
              </td>
              <td
                role="cell"
                data-label={t('summary.colSettlement')}
                className={cn(AMOUNT_CELL, STACKED_AREA.settlement, 'text-settlement')}
              >
                {totals.settlement}
              </td>
              <td
                role="cell"
                data-label={t('summary.colBalance')}
                className={cn(AMOUNT_CELL, STACKED_AREA.balance, BALANCE_CLASSES[totals.balanceTone])}
              >
                {totals.balance}
              </td>
              <td role="cell" colSpan={3} className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function MonthRow({ month: m }: { month: SummaryMonthRow }) {
  const { t } = usePreferences();
  const cellColor = m.hasData ? undefined : 'text-muted-foreground';
  // Stacked, a month with nothing to show keeps only its first line.
  const amountCell = cn(AMOUNT_CELL, !m.hasData && 'max-md:hidden');
  return (
    <tr role="row" className={cn(ROW, 'border-b border-divider md:h-14', m.isCurrent && 'bg-current-row')}>
      <th role="rowheader" scope="row" className={cn(FIRST_CELL, 'font-semibold')}>
        <span className="flex items-center gap-2">
          {m.name}
          {m.isCurrent && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em] text-white uppercase">
              {t('summary.current')}
            </span>
          )}
        </span>
      </th>
      <td
        role="cell"
        data-label={t('summary.colIncome')}
        className={cn(amountCell, STACKED_AREA.income, cellColor)}
      >
        {m.income}
      </td>
      <td
        role="cell"
        data-label={t('summary.colExpense')}
        className={cn(amountCell, STACKED_AREA.expense, cellColor)}
      >
        {m.expense}
      </td>
      <td
        role="cell"
        data-label={t('summary.colSettlement')}
        className={cn(
          amountCell,
          STACKED_AREA.settlement,
          m.hasSettlement ? 'text-settlement' : 'text-muted-foreground',
        )}
      >
        {m.settlement}
      </td>
      <td
        role="cell"
        data-label={t('summary.colBalance')}
        className={cn(amountCell, STACKED_AREA.balance, 'font-semibold', BALANCE_CLASSES[m.balanceTone])}
      >
        {m.balance}
      </td>
      <td
        role="cell"
        data-label={t('summary.colAccumulated')}
        className={cn(
          STACKED_CELL_LABEL,
          m.hasData ? STACKED_AREA.accumulated : STACKED_AREA.accumulatedAlone,
          'block md:table-cell md:px-1.5',
          !m.hasAccumulated && 'max-md:hidden',
        )}
      >
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
      <td role="cell" className={cn(STACKED_AREA.status, 'block justify-self-end md:table-cell md:px-1.5')}>
        <span
          className={cn(
            'inline-block rounded-full border px-2.5 py-[3px] font-sans text-[13px] font-semibold whitespace-nowrap',
            STATUS_CLASSES[m.statusTone],
          )}
        >
          {m.statusLabel}
        </span>
      </td>
      <td role="cell" className={cn(STACKED_AREA.link, 'block md:table-cell md:pr-3')}>
        <Link
          to={m.href}
          aria-label={m.openLabel}
          title={m.openLabel}
          className="flex size-11 items-center justify-center rounded-lg text-icon hover:bg-accent max-md:-mr-2"
        >
          <ChevronRight className="size-[17px]" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}
