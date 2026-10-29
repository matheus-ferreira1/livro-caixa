import { percentOf, sumCents, type Cents } from '../money/money';
import type { Transaction } from './transaction';

const clampShare = (share: number): number => Math.min(100, Math.max(0, Number.isFinite(share) ? share : 0));

const total = (list: Transaction[]): Cents => sumCents(list.map((t) => t.valueCents));

export interface Settlement {
  sharePercent: number;
  items: Transaction[];
  totalCents: Cents;
  partnerCents: Cents;
  mineCents: Cents;
  receivedCents: Cents;
  scheduledCents: Cents;
  /** What is still to be settled: partner share minus received and already scheduled acertos. */
  balanceCents: Cents;
}

/** The acerto of one month: the partner's share of the split expenses. */
export function computeSettlement(
  monthTransactions: Transaction[],
  share: number,
  { includePending }: { includePending: boolean },
): Settlement {
  const sharePercent = clampShare(share);
  const items = monthTransactions.filter(
    (t) => t.type === 'despesa' && t.split && (t.confirmed || includePending),
  );
  const settlements = monthTransactions.filter((t) => t.type === 'acerto');
  const totalCents = total(items);
  const partnerCents = percentOf(totalCents, sharePercent);
  const receivedCents = total(settlements.filter((t) => t.confirmed));
  const scheduledCents = total(settlements.filter((t) => !t.confirmed));
  return {
    sharePercent,
    items,
    totalCents,
    partnerCents,
    mineCents: totalCents - partnerCents,
    receivedCents,
    scheduledCents,
    balanceCents: Math.max(0, partnerCents - receivedCents - scheduledCents),
  };
}

export interface MonthTiles {
  incomeConfirmedCents: Cents;
  incomeAllCents: Cents;
  expenseConfirmedCents: Cents;
  expenseAllCents: Cents;
  settlementPendingCents: Cents;
  settlementReceivedCents: Cents;
  balanceCents: Cents;
  projectedBalanceCents: Cents;
}

/** The four tiles above the month list. */
export function monthTiles(monthTransactions: Transaction[], share: number): MonthTiles {
  const income = monthTransactions.filter((t) => t.type === 'receita');
  const expenses = monthTransactions.filter((t) => t.type === 'despesa');
  const confirmed = (list: Transaction[]) => list.filter((t) => t.confirmed);
  const s = computeSettlement(monthTransactions, share, { includePending: true });
  const expectedSettlement = Math.max(s.partnerCents, s.receivedCents + s.scheduledCents);

  return {
    incomeConfirmedCents: total(confirmed(income)),
    incomeAllCents: total(income),
    expenseConfirmedCents: total(confirmed(expenses)),
    expenseAllCents: total(expenses),
    settlementPendingCents: Math.max(0, s.partnerCents - s.receivedCents),
    settlementReceivedCents: s.receivedCents,
    balanceCents: total(confirmed(income)) + s.receivedCents - total(confirmed(expenses)),
    projectedBalanceCents: total(income) + expectedSettlement - total(expenses),
  };
}
