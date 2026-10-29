import type { Cents } from '../money/money';
import type { IsoDate } from '../dates/dates';

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

export interface Settings {
  partnerName: string;
  /** Partner's share of split bills, 0–100. */
  partnerShare: number;
}

export const DEFAULT_PARTNER_NAME = 'Companheira';

export const displayPartnerName = (settings: Settings): string =>
  settings.partnerName.trim() || DEFAULT_PARTNER_NAME;

/** Income-side entries count positive in balances; expenses count negative. */
export const signedCents = (t: Pick<Transaction, 'type' | 'valueCents'>): Cents =>
  t.type === 'despesa' ? -t.valueCents : t.valueCents;
