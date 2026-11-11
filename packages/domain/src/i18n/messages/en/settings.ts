import type { settingsPtBR } from '../pt-BR/settings';

export const settingsEn: typeof settingsPtBR = {
  'settings.eyebrow': 'Preferences',

  'settings.categoriesTitle': 'Categories',
  'settings.categoriesIntro':
    'Categories organize income and expenses. Settlements do not use a category. A category in use cannot be deleted, only renamed.',
  'settings.typeIncome': 'Income',
  'settings.typeExpense': 'Expense',
  'settings.listIncome': 'Income',
  'settings.listExpense': 'Expenses',
  'settings.newCategory': 'New category',
  'settings.newCategoryPlaceholder': 'E.g. Pets, Gym, Gas',
  'settings.type': 'Type',
  'settings.newCategoryType': 'Type of the new category',
  'settings.color': 'Color',
  'settings.newCategoryColor': 'Color of the new category',
  'settings.categoryColor': 'Category color',
  'settings.colorSwatch': (position) => `Color ${position}`,
  'settings.add': 'Add',
  'settings.name': 'Name',
  'settings.cancel': 'Cancel',
  'settings.save': 'Save',
  'settings.edit': (name) => `Edit ${name}`,
  'settings.delete': (name) => `Delete ${name}`,
  'settings.noEntries': 'No entries',
  'settings.entryCount': (count) => `${count} ${count === 1 ? 'entry' : 'entries'}`,
  'settings.categoryCount': (count) => `${count} ${count === 1 ? 'category' : 'categories'}`,
  'settings.categoryCreated': (name) => `Category “${name}” created`,
  'settings.categoryUpdated': 'Category updated',
  'settings.categoryDeleted': (name) => `Category “${name}” deleted`,

  'settings.splitTitle': 'Bill splitting',
  'settings.splitIntro':
    'Sets who splits the bills marked as “split” and each one’s share. It is the basis of the settlement calculation.',
  'settings.partnerName': 'Partner’s name',
  'settings.partnerShare': (partnerName) => `${partnerName}’s share of split bills`,
  'settings.splitExample': (total, partnerName, partner, mine) =>
    `Example: on a split bill of ${total}, ${partnerName} pays ${partner} and you pay ${mine}.`,

  'settings.preferencesTitle': 'Language and currency',
  'settings.preferencesIntro':
    'Sets the interface language and how amounts are shown. Amounts are not converted.',
  'settings.language': 'Language',
  'settings.currency': 'Currency',
  'settings.currencyBRL': 'Brazilian real (R$)',
  'settings.currencyUSD': 'US dollar ($)',
  'settings.currencyEUR': 'Euro (€)',
  'settings.currencyGBP': 'Pound sterling (£)',
};
