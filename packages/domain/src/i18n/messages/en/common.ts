import type { commonPtBR } from '../pt-BR/common';

export const commonEn: typeof commonPtBR = {
  'nav.main': 'Main',
  'nav.overview': 'Overview',
  'nav.entries': 'Entries',
  'nav.wealth': 'Net worth',
  'nav.summary': 'Monthly summary',
  'nav.settings': 'Settings',

  'shell.account': (name) => `${name}’s account`,
  'shell.signOut': 'Sign out',

  'common.close': 'Close',

  'api.unreachable': 'Could not reach the server. Try again.',
};
