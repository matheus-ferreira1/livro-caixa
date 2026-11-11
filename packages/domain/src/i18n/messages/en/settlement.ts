import type { settlementPtBR } from '../pt-BR/settlement';

export const settlementEn: typeof settlementPtBR = {
  'settlement.dialogTitle': 'Bill settlement',
  'settlement.dialogDescription': (month, partner) => `${month} · bills split with ${partner}`,
  'settlement.registered': 'Settlement registered as pending. Confirm when you receive it.',
  'settlement.whenSent': (partner) => `When ${partner} sends the amount`,
  'settlement.registerHelp':
    'Register the settlement as pending now and mark it confirmed when the money arrives.',
  'settlement.registerAmount': (amount) => `Register settlement of ${amount}`,
  'settlement.alreadyRegistered': 'This month’s settlement is already registered',

  'settlement.printSummary': 'Summary for a screenshot',
  'settlement.printHeader': (month) => `Settlement · ${month}`,
  'settlement.amountDue': (partner) => `Amount to settle by ${partner}`,
  'settlement.columnBill': 'Bill',
  'settlement.columnTotal': 'Total',
  'settlement.columnPartner': (partner) => `${partner}’s share`,
  'settlement.noBills': 'No split bills this month.',
  'settlement.totalBills': 'Total of split bills',
  'settlement.mineShare': (percent) => `My share (${percent}%)`,
  'settlement.partnerShare': (partner, percent) => `${partner}’s share (${percent}%)`,
  'settlement.alreadyReceived': 'Already received',
  'settlement.alreadyScheduled': 'Already registered as pending',
  'settlement.pendingTag': 'pending',
  'settlement.footnote': (minePercent, partnerPercent, count, includePending) =>
    `Split ${minePercent}% / ${partnerPercent}% · ${count} ${count === 1 ? 'bill' : 'bills'} · ${
      includePending ? 'includes pending' : 'confirmed only'
    }`,

  'settlement.includePendingTitle': 'Include pending bills',
  'settlement.includePendingHelp': 'Useful to announce the amount before all the bills fall due.',
  'settlement.messageLabel': 'Text message',
  'settlement.copy': 'Copy text',
  'settlement.copied': 'Copied!',
  'settlement.whatsapp': 'Send on WhatsApp',
  'settlement.copyFailed': 'Could not copy automatically. Select the text above and copy it.',
};
