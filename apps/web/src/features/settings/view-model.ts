import { CATEGORY_TYPES, splitExample, type Category, type Localization } from '@livro-caixa/domain';

/** Keeps the share label beside the slider from wrapping, as in the design. */
const SHARE_LABEL_NAME_LENGTH = 12;

/** Rows a category list shows before it scrolls inside its card, so the page never grows with the catalog. */
export const CATEGORY_LIST_ROWS = 8;

/** Search is noise on a short catalog; once shown, it stays while a query is typed. */
export function showCategorySearch(categories: readonly Pick<Category, 'type'>[], query: string): boolean {
  if (query) return true;
  return CATEGORY_TYPES.some(
    (type) => categories.filter((category) => category.type === type).length > CATEGORY_LIST_ROWS,
  );
}

export const usageLabel = (count: number, { t }: Pick<Localization, 't'>): string =>
  count ? t('settings.entryCount', count) : t('settings.noEntries');

export const categoryCountLabel = (count: number, { t }: Pick<Localization, 't'>): string =>
  t('settings.categoryCount', count);

export const shareLabel = (partnerName: string, share: number): string =>
  `${partnerName.slice(0, SHARE_LABEL_NAME_LENGTH)} ${share}%`;

export function shareExampleText(partnerName: string, share: number, { t, money }: Localization): string {
  const { totalCents, partnerCents, mineCents } = splitExample(share);
  return t(
    'settings.splitExample',
    money.format(totalCents),
    partnerName,
    money.format(partnerCents),
    money.format(mineCents),
  );
}
