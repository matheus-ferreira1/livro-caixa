import { authEn } from './en/auth';
import { commonEn } from './en/common';
import { dashboardEn } from './en/dashboard';
import { domainEn } from './en/domain';
import { recurringEn } from './en/recurring';
import { settingsEn } from './en/settings';
import { settlementEn } from './en/settlement';
import { summaryEn } from './en/summary';
import { transactionsEn } from './en/transactions';
import { wealthEn } from './en/wealth';
import type { Messages } from './pt-BR';

export const EN_SECTIONS = {
  auth: authEn,
  common: commonEn,
  dashboard: dashboardEn,
  domain: domainEn,
  recurring: recurringEn,
  settings: settingsEn,
  settlement: settlementEn,
  summary: summaryEn,
  transactions: transactionsEn,
  wealth: wealthEn,
};

/** Typed as `Messages`, so a key missing from the English side is a compile error. */
export const en: Messages = {
  ...authEn,
  ...commonEn,
  ...dashboardEn,
  ...domainEn,
  ...recurringEn,
  ...settingsEn,
  ...settlementEn,
  ...summaryEn,
  ...transactionsEn,
  ...wealthEn,
};
