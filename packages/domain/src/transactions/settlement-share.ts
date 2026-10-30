import { dateParts, lastDayOfMonth, monthLabel, pad2, type MonthKey } from '../dates/dates';
import { formatMoney, MINUS, percentOf } from '../money/money';
import type { Settlement } from './month-summary';
import type { TransactionInput } from './transaction-input';

export interface SettlementContext {
  month: MonthKey;
  partnerName: string;
}

export const SETTLEMENT_DESCRIPTION = 'Acerto das contas divididas';

/** The WhatsApp-ready message of the Acerto dialog, worded as in the design. */
export function buildShareText(s: Settlement, { month, partnerName }: SettlementContext): string {
  const itemLines = s.items.length
    ? s.items.map((t) => {
        const { dd, mm } = dateParts(t.date);
        const pending = t.confirmed ? '' : ' (previsto)';
        const part = formatMoney(percentOf(t.valueCents, s.sharePercent));
        return `• ${dd}/${mm} ${t.description}${pending}: ${formatMoney(t.valueCents)} → ${part}`;
      })
    : ['• Nenhuma conta dividida neste mês'];
  const deductions = [
    s.receivedCents > 0 ? `Já recebido: ${MINUS} ${formatMoney(s.receivedCents)}` : null,
    s.scheduledCents > 0 ? `Já combinado: ${MINUS} ${formatMoney(s.scheduledCents)}` : null,
  ].filter((line) => line !== null);

  return [
    `*Acerto de contas — ${monthLabel(month)}*`,
    '',
    `Contas divididas (${s.sharePercent}% sua parte):`,
    ...itemLines,
    '',
    `Total das contas: ${formatMoney(s.totalCents)}`,
    `Parte de ${partnerName} (${s.sharePercent}%): ${formatMoney(s.partnerCents)}`,
    ...deductions,
    '',
    `*Valor a acertar: ${formatMoney(s.balanceCents)}*`,
  ].join('\n');
}

/** The pending acerto that "Registrar acerto" creates, dated on the month's last day. */
export function settlementEntry(s: Settlement, { month, partnerName }: SettlementContext): TransactionInput {
  return {
    date: `${month}-${pad2(lastDayOfMonth(month))}`,
    description: SETTLEMENT_DESCRIPTION,
    note: `${partnerName} · ${s.items.length} contas de ${monthLabel(month)}`,
    type: 'acerto',
    categoryId: null,
    valueCents: s.balanceCents,
    split: false,
    confirmed: false,
    recurring: false,
  };
}
