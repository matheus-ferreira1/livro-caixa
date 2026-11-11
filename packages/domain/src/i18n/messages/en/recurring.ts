import type { recurringPtBR } from '../pt-BR/recurring';

export const recurringEn: typeof recurringPtBR = {
  'recurring.banner': (count, month) =>
    `${
      count === 1
        ? '1 recurring entry has not been generated yet'
        : `${count} recurring entries have not been generated yet`
    } for ${month}.`,
  'recurring.bannerHelp': 'They come in as pending, with last month’s date and amount, for you to adjust.',
  'recurring.dismiss': 'Not now',
  'recurring.reviewAndGenerate': 'Review and generate',

  'recurring.dialogTitle': 'Generate recurring entries',
  'recurring.dialogDescription': (month) => `${month} · from the latest occurrence of each recurring entry`,
  'recurring.introBefore': 'Entries come in as ',
  'recurring.introStrong': 'pending',
  'recurring.introAfter':
    ', without a note. Adjust dates and amounts here or later, right in the list. Uncheck what does not happen this month.',
  'recurring.selectAll': 'Select all',
  'recurring.columnEntry': 'Entry',
  'recurring.columnType': 'Type',
  'recurring.columnDate': 'Date',
  'recurring.columnValue': (symbol) => `Amount (${symbol})`,
  'recurring.columnLast': 'Last entered',
  'recurring.allDoneTitle': 'All caught up',
  'recurring.allDoneText': (month) => `All recurring entries are already in ${month}.`,
  'recurring.selected': (count, total) => `${count} of ${total} selected`,
  'recurring.cancel': 'Cancel',
  'recurring.generate': (count) => `Generate ${count} ${count === 1 ? 'entry' : 'entries'}`,
  'recurring.generateNone': 'Generate entries',
  'recurring.generated': (count) => `${count} ${count === 1 ? 'entry' : 'entries'} generated as pending`,
  'recurring.includeRow': (description) => `Include ${description}`,
  'recurring.dateRow': (description) => `Date of ${description}`,
  'recurring.valueRow': (description) => `Amount of ${description}`,
  'recurring.splitSuffix': ' · split',
};
