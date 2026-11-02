import {
  buildShareText,
  dateParts,
  formatMoney,
  MINUS,
  monthLabel,
  percentOf,
  type Category,
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

const deduction = (label: string, cents: number) =>
  cents > 0 ? [{ label, value: `${MINUS} ${formatMoney(cents)}` }] : [];

/** Display data for the Acerto de contas dialog, labeled as in the design. */
export function settlementViewModel(
  s: Settlement,
  { month, partnerName, categories, includePending }: SettlementViewContext,
): SettlementViewModel {
  const myShare = 100 - s.sharePercent;
  const shareText = buildShareText(s, { month, partnerName });
  return {
    monthLabel: monthLabel(month),
    balance: formatMoney(s.balanceCents),
    items: s.items.map((t) => {
      const { dd, mm } = dateParts(t.date);
      const category = t.categoryId ? categories.get(t.categoryId) : undefined;
      return {
        id: t.id,
        description: t.description,
        meta: [`${dd}/${mm}`, category?.name, t.confirmed ? null : 'previsto'].filter(Boolean).join(' · '),
        total: formatMoney(t.valueCents),
        partner: formatMoney(percentOf(t.valueCents, s.sharePercent)),
      };
    }),
    total: formatMoney(s.totalCents),
    mineLabel: `Minha parte (${myShare}%)`,
    mine: formatMoney(s.mineCents),
    partnerLabel: `Parte de ${partnerName} (${s.sharePercent}%)`,
    partner: formatMoney(s.partnerCents),
    deductions: [
      ...deduction('Já recebido', s.receivedCents),
      ...deduction('Já registrado como previsto', s.scheduledCents),
    ],
    footnote: `Divisão ${myShare}% / ${s.sharePercent}% · ${s.items.length} contas · ${
      includePending ? 'inclui previstas' : 'só confirmadas'
    }`,
    shareText,
    whatsappUrl: WHATSAPP_SHARE_URL + encodeURIComponent(shareText),
    register:
      s.balanceCents > 0
        ? { label: `Registrar acerto de ${formatMoney(s.balanceCents)}`, disabled: false }
        : { label: 'Acerto do mês já registrado', disabled: true },
  };
}
