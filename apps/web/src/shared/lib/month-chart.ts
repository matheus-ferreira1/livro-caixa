import { monthShortName, type MonthKey } from '@livro-caixa/domain';

const JANUARY = '01';
const TOOLTIP_EDGE_MONTHS = 2;

export type TooltipAlign = 'start' | 'center' | 'end';

/** Keeps the tooltips of the outer months from running off the chart. */
export function tooltipAlignOf(index: number, count: number): TooltipAlign {
  if (index < TOOLTIP_EDGE_MONTHS) return 'start';
  return index >= count - TOOLTIP_EDGE_MONTHS ? 'end' : 'center';
}

/** Shows the year on the first month of the chart and on each January. */
export function monthAxisLabel(month: MonthKey, index: number): string {
  const showYear = index === 0 || month.slice(5) === JANUARY;
  return showYear ? `${monthShortName(month)} ’${month.slice(2, 4)}` : monthShortName(month);
}
