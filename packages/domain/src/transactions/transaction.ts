import type { Translate } from '../i18n/translate';
import type { IsoDate } from '../dates/dates';
import type { Cents } from '../money/money';
import type { Currency, Language } from '../settings/preferences';

export const TRANSACTION_TYPES = ['receita', 'despesa', 'acerto'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  date: IsoDate;
  description: string;
  note: string;
  type: TransactionType;
  /** Always null for an acerto. */
  categoryId: string | null;
  valueCents: Cents;
  /** Only an expense can be split with the partner. */
  split: boolean;
  confirmed: boolean;
  recurring: boolean;
  /** Links every occurrence of a recurring entry across months. */
  seriesId: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: Exclude<TransactionType, 'acerto'>;
  color: string;
}

export interface PartnerSettings {
  partnerName: string;
  /** Partner's share of split bills, 0–100. */
  partnerShare: number;
}

export interface Settings extends PartnerSettings {
  language: Language;
  currency: Currency;
}

export const displayPartnerName = (settings: PartnerSettings, t: Translate): string =>
  settings.partnerName.trim() || t('partner.default');

/** Income-side entries count positive in balances; expenses count negative. */
export const signedCents = (t: Pick<Transaction, 'type' | 'valueCents'>): Cents =>
  t.type === 'despesa' ? -t.valueCents : t.valueCents;
