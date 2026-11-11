import {
  buildShareText,
  dateParts,
  MINUS,
  monthLabel,
  percentOf,
  type Category,
  type Localization,
  type MonthKey,
  type Settlement,
} from '@livro-caixa/domain';

const WHATSAPP_SHARE_URL = 'https://wa.me/?text=';

interface SettlementViewContext {
  month: MonthKey;
  partnerName: string;
  categories: Map<string, Category>;
  includePending: boolean;
}

export interface SettlementViewModel {
  monthLabel: string;
  balance: string;
  items: { id: string; description: string; meta: string; total: string; partner: string }[];
  total: string;
  mineLabel: string;
  mine: string;
  partnerLabel: string;
  partner: string;
  deductions: { label: string; value: string }[];
  footnote: string;
  shareText: string;
  whatsappUrl: string;
  register: { label: string; disabled: boolean };
}

/** Display data for the Acerto de contas dialog, labeled as in the design. */
export function settlementViewModel(
  s: Settlement,
  { month, partnerName, categories, includePending }: SettlementViewContext,
  l10n: Pick<Localization, 't' | 'money'>,
): SettlementViewModel {
  const { t, money } = l10n;
  const myShare = 100 - s.sharePercent;
  const shareText = buildShareText(s, { month, partnerName }, l10n);
  const deduction = (label: string, cents: number) =>
    cents > 0 ? [{ label, value: `${MINUS} ${money.format(cents)}` }] : [];
  return {
    monthLabel: monthLabel(month, t),
    balance: money.format(s.balanceCents),
    items: s.items.map((item) => {
      const { dd, mm } = dateParts(item.date, t);
      const category = item.categoryId ? categories.get(item.categoryId) : undefined;
      return {
        id: item.id,
        description: item.description,
        meta: [`${dd}/${mm}`, category?.name, item.confirmed ? null : t('settlement.pendingTag')]
          .filter(Boolean)
          .join(' · '),
        total: money.format(item.valueCents),
        partner: money.format(percentOf(item.valueCents, s.sharePercent)),
      };
    }),
    total: money.format(s.totalCents),
    mineLabel: t('settlement.mineShare', myShare),
    mine: money.format(s.mineCents),
    partnerLabel: t('settlement.partnerShare', partnerName, s.sharePercent),
    partner: money.format(s.partnerCents),
    deductions: [
      ...deduction(t('settlement.alreadyReceived'), s.receivedCents),
      ...deduction(t('settlement.alreadyScheduled'), s.scheduledCents),
    ],
    footnote: t('settlement.footnote', myShare, s.sharePercent, s.items.length, includePending),
    shareText,
    whatsappUrl: WHATSAPP_SHARE_URL + encodeURIComponent(shareText),
    register:
      s.balanceCents > 0
        ? { label: t('settlement.registerAmount', money.format(s.balanceCents)), disabled: false }
        : { label: t('settlement.alreadyRegistered'), disabled: true },
  };
}
