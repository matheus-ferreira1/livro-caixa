import { authPtBR } from './pt-BR/auth';
import { commonPtBR } from './pt-BR/common';
import { dashboardPtBR } from './pt-BR/dashboard';
import { domainPtBR } from './pt-BR/domain';
import { recurringPtBR } from './pt-BR/recurring';
import { settingsPtBR } from './pt-BR/settings';
import { settlementPtBR } from './pt-BR/settlement';
import { summaryPtBR } from './pt-BR/summary';
import { transactionsPtBR } from './pt-BR/transactions';
import { wealthPtBR } from './pt-BR/wealth';

/** The source copy, verbatim from the design. `en` must define exactly the same keys. */
export const PT_BR_SECTIONS = {
  auth: authPtBR,
  common: commonPtBR,
  dashboard: dashboardPtBR,
  domain: domainPtBR,
  recurring: recurringPtBR,
  settings: settingsPtBR,
  settlement: settlementPtBR,
  summary: summaryPtBR,
  transactions: transactionsPtBR,
  wealth: wealthPtBR,
};

export const ptBR = {
  ...authPtBR,
  ...commonPtBR,
  ...dashboardPtBR,
  ...domainPtBR,
  ...recurringPtBR,
  ...settingsPtBR,
  ...settlementPtBR,
  ...summaryPtBR,
  ...transactionsPtBR,
  ...wealthPtBR,
};

export type Messages = typeof ptBR;
