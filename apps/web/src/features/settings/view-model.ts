import { formatMoney, splitExample } from '@livro-caixa/domain';
import { pluralize } from '@/shared/lib/utils';

/** Keeps the share label beside the slider from wrapping, as in the design. */
const SHARE_LABEL_NAME_LENGTH = 12;

export const usageLabel = (count: number): string =>
  count ? pluralize(count, 'lançamento', 'lançamentos') : 'Sem lançamentos';

export const categoryCountLabel = (count: number): string => pluralize(count, 'categoria', 'categorias');

export const shareLabel = (partnerName: string, share: number): string =>
  `${partnerName.slice(0, SHARE_LABEL_NAME_LENGTH)} ${share}%`;

export function shareExampleText(partnerName: string, share: number): string {
  const { totalCents, partnerCents, mineCents } = splitExample(share);
  return `Exemplo: numa conta dividida de ${formatMoney(totalCents)}, ${partnerName} paga ${formatMoney(partnerCents)} e você paga ${formatMoney(mineCents)}.`;
}
