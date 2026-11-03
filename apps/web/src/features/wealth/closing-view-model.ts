import {
  assetValue,
  ASSET_CLASSES,
  CLOSING_OPEN_DAY,
  closingDraft,
  dateParts,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  monthLabel,
  monthName,
  type Asset,
  type ClosingEdits,
  type MonthKey,
  type Wealth,
} from '@livro-caixa/domain';

const NO_VALUE = '—';

export type ClosingBanner = { kind: 'open'; title: string } | { kind: 'waiting'; label: string } | null;

export interface ClosingRowView {
  id: string;
  name: string;
  subtitle: string;
  last: string;
  lastDate: string;
  flowInput: string;
  valueInput: string;
  flowLabel: string;
  valueLabel: string;
  valid: boolean;
}

export interface ClosingView {
  subtitle: string;
  manualRows: ClosingRowView[];
  autoRows: { id: string; name: string; subtitle: string; value: string }[];
  total: string;
  change: string;
  contributions: string;
  yieldLabel: string;
  changeCents: number | null;
  yieldCents: number | null;
  submitLabel: string;
}

export function closingBanner(wealth: Wealth): ClosingBanner {
  const open = wealth.openMonth;
  if (wealth.closingAvailable) {
    return { kind: 'open', title: `O fechamento de ${monthLabel(open)} está disponível.` };
  }
  const last = wealth.kpis.lastClosing;
  if (!last) return null;
  return {
    kind: 'waiting',
    label: `Fechamento de ${monthLabel(last.month)} registrado. O de ${monthName(open)} abre em ${CLOSING_OPEN_DAY}/${open.slice(5)} e até lá não há nada para atualizar.`,
  };
}

const classLabel = (key: string): string => ASSET_CLASSES.find((c) => c.key === key)?.label ?? key;

function differenceOf(totalCents: number, contributionsCents: number, previousCents: number | null) {
  if (previousCents === null) return { changeCents: null, yieldCents: null };
  const changeCents = totalCents - previousCents;
  return { changeCents, yieldCents: changeCents - contributionsCents };
}

export function closingView(
  assets: Asset[],
  edits: ClosingEdits,
  month: MonthKey,
  last: { month: MonthKey; totalCents: number } | null,
): ClosingView {
  const draft = closingDraft(assets, edits);
  const { changeCents, yieldCents } = differenceOf(
    draft.totalCents,
    draft.contributionsCents,
    last?.totalCents ?? null,
  );
  return {
    subtitle: last
      ? `Comparado ao fechamento de ${monthName(last.month)} (${formatMoney(last.totalCents)})`
      : 'Primeiro fechamento',
    manualRows: draft.rows.map(({ asset, flowInput, valueInput, valid }) => {
      const { dd, mm } = dateParts(asset.updatedAt);
      return {
        id: asset.id,
        name: asset.name,
        subtitle: `${asset.institution} · ${classLabel(asset.assetClass)}`,
        last: formatMoney(asset.currentCents),
        lastDate: `em ${dd}/${mm}`,
        flowInput,
        valueInput,
        flowLabel: `Aporte ou resgate em ${asset.name}`,
        valueLabel: `Valor atual de ${asset.name}`,
        valid,
      };
    }),
    autoRows: draft.autoAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      subtitle: `${asset.institution} · ${formatQuantity(asset.quantityE8)} × ${formatMoney(asset.priceCents)}`,
      value: formatMoney(assetValue(asset)),
    })),
    total: formatMoney(draft.totalCents),
    change: changeCents === null ? NO_VALUE : formatSignedMoney(changeCents),
    contributions: formatSignedMoney(draft.contributionsCents),
    yieldLabel: yieldCents === null ? NO_VALUE : formatSignedMoney(yieldCents),
    changeCents,
    yieldCents,
    submitLabel: `Registrar fechamento de ${monthName(month)}`,
  };
}
