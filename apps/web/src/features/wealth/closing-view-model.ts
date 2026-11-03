import {
  assetValue,
  assetClassLabel,
  CLOSING_OPEN_DAY,
  closingDraft,
  dateParts,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  monthLabel,
  monthName,
  unavailableQuoteCount,
  type Asset,
  type ClosingEdits,
  type MonthKey,
  type Wealth,
} from '@livro-caixa/domain';
import { pricingOf, type AssetRow } from './view-model';

const NO_VALUE = '—';
const MANUAL_REVIEW = 'Uma vez por mês: confira os valores manuais e informe aportes ou resgates.';
const AUTO_TRADES = 'Compras e vendas são registradas editando o ativo (quantidade e preço médio).';

type LastClosing = { month: MonthKey; totalCents: number };

export type ClosingBanner =
  { kind: 'open'; title: string; detail: string } | { kind: 'waiting'; label: string } | null;

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
  flowValid: boolean;
  valueValid: boolean;
}

export interface ClosingView {
  subtitle: string;
  manualRows: ClosingRowView[];
  autoNote: string;
  autoRows: ({ id: string; name: string; subtitle: string; value: string } & Pick<
    AssetRow,
    'pricingTag' | 'priceNote'
  >)[];
  total: string;
  change: string;
  contributions: string;
  yieldLabel: string;
  changeCents: number | null;
  yieldCents: number | null;
  submitLabel: string;
}

function missingQuotes(count: number): string {
  return count === 1
    ? '1 ativo sem cotação usa o último preço salvo.'
    : `${count} ativos sem cotação usam o último preço salvo.`;
}

function closingAutoNote(assets: Asset[]): string {
  const missing = unavailableQuoteCount(assets);
  return missing === 0
    ? `Já atualizadas, nada a fazer. ${AUTO_TRADES}`
    : `${missingQuotes(missing)} Para corrigir, edite o ativo antes de fechar. ${AUTO_TRADES}`;
}

function closingBannerDetail(assets: Asset[]): string {
  const missing = unavailableQuoteCount(assets);
  return missing === 0
    ? `${MANUAL_REVIEW} As cotações automáticas já estão em dia.`
    : `${MANUAL_REVIEW} ${missingQuotes(missing)}`;
}

export function closingBanner(wealth: Wealth): ClosingBanner {
  const open = wealth.openMonth;
  if (wealth.closingAvailable) {
    return {
      kind: 'open',
      title: `O fechamento de ${monthLabel(open)} está disponível.`,
      detail: closingBannerDetail(wealth.assets),
    };
  }
  const last = wealth.kpis.lastClosing;
  if (!last) return null;
  return {
    kind: 'waiting',
    label: `Fechamento de ${monthLabel(last.month)} registrado. O de ${monthName(open)} abre em ${CLOSING_OPEN_DAY}/${open.slice(5)} e até lá não há nada para atualizar.`,
  };
}

function differenceOf(totalCents: number, contributionsCents: number, previousCents: number | null) {
  if (previousCents === null) return { changeCents: null, yieldCents: null };
  const changeCents = totalCents - previousCents;
  return { changeCents, yieldCents: changeCents - contributionsCents };
}

export const closingSubtitle = (last: LastClosing | null): string =>
  last
    ? `Comparado ao fechamento de ${monthName(last.month)} (${formatMoney(last.totalCents)})`
    : 'Primeiro fechamento';

export function closingView(
  assets: Asset[],
  edits: ClosingEdits,
  month: MonthKey,
  last: LastClosing | null,
  now: number,
): ClosingView {
  const draft = closingDraft(assets, edits);
  const { changeCents, yieldCents } = differenceOf(
    draft.totalCents,
    draft.contributionsCents,
    last?.totalCents ?? null,
  );
  return {
    subtitle: closingSubtitle(last),
    manualRows: draft.rows.map(({ asset, flowInput, valueInput, flowCents, valueCents }) => {
      const { dd, mm } = dateParts(asset.updatedAt);
      return {
        id: asset.id,
        name: asset.name,
        subtitle: `${asset.institution} · ${assetClassLabel(asset.assetClass)}`,
        last: formatMoney(asset.currentCents),
        lastDate: `em ${dd}/${mm}`,
        flowInput,
        valueInput,
        flowLabel: `Aporte ou resgate em ${asset.name}`,
        valueLabel: `Valor atual de ${asset.name}`,
        flowValid: flowCents !== null,
        valueValid: valueCents !== null,
      };
    }),
    autoNote: closingAutoNote(assets),
    autoRows: draft.autoAssets.map((asset) => ({
      ...pricingOf(asset, now),
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
