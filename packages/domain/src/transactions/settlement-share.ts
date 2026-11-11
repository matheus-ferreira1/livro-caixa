import { dateParts, lastDayOfMonth, monthLabel, pad2, type MonthKey } from '../dates/dates';
import type { Localization } from '../i18n/localization';
import { MINUS, percentOf } from '../money/money';
import type { Settlement } from './month-summary';
import type { TransactionInput } from './transaction-input';

export interface SettlementContext {
  month: MonthKey;
  partnerName: string;
}

type Words = Pick<Localization, 't' | 'money'>;

/** The WhatsApp-ready message of the Acerto dialog, worded as in the design. */
export function buildShareText(
  s: Settlement,
  { month, partnerName }: SettlementContext,
  { t, money }: Words,
): string {
  const itemLines = s.items.length
    ? s.items.map((item) => {
        const { dd, mm } = dateParts(item.date, t);
        const part = money.format(percentOf(item.valueCents, s.sharePercent));
        return t(
          'settlement.shareItem',
          `${dd}/${mm}`,
          item.description,
          !item.confirmed,
          money.format(item.valueCents),
          part,
        );
      })
    : [t('settlement.shareNoItems')];
  const deductions = [
    s.receivedCents > 0 ? t('settlement.shareReceived', `${MINUS} ${money.format(s.receivedCents)}`) : null,
    s.scheduledCents > 0
      ? t('settlement.shareScheduled', `${MINUS} ${money.format(s.scheduledCents)}`)
      : null,
  ].filter((line) => line !== null);

  return [
    t('settlement.shareTitle', monthLabel(month, t)),
    '',
    t('settlement.shareHeading', s.sharePercent),
    ...itemLines,
    '',
    t('settlement.shareTotal', money.format(s.totalCents)),
    t('settlement.sharePartner', partnerName, s.sharePercent, money.format(s.partnerCents)),
    ...deductions,
    '',
    t('settlement.shareBalance', money.format(s.balanceCents)),
  ].join('\n');
}

/** The pending acerto that "Registrar acerto" creates, dated on the month's last day. */
export function settlementEntry(
  s: Settlement,
  { month, partnerName }: SettlementContext,
  { t }: Pick<Localization, 't'>,
): TransactionInput {
  return {
    date: `${month}-${pad2(lastDayOfMonth(month))}`,
    description: t('settlement.description'),
    note: t('settlement.entryNote', partnerName, s.items.length, monthLabel(month, t)),
    type: 'acerto',
    categoryId: null,
    valueCents: s.balanceCents,
    split: false,
    confirmed: false,
    recurring: false,
  };
}
