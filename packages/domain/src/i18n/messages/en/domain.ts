import type { domainPtBR } from '../pt-BR/domain';

export const domainEn: typeof domainPtBR = {
  'login.missingFields': 'Enter your email and password.',
  'login.invalidEmail': 'Enter a valid email.',
  'login.invalidCredentials': 'Wrong email or password.',
  'login.loggedOut': 'You signed out of your account.',
  'login.lockedOut': (secondsLeft) => `Too many attempts. Try again in ${secondsLeft} s.`,

  'form.date': 'Enter the date.',
  'form.description': 'Enter the description.',
  'form.value': 'Enter an amount greater than zero.',
  'form.category': 'Choose a category.',

  'category.nameRequired': 'Give the category a name.',
  'category.duplicate': 'A category with this name already exists for this type.',
  'category.notFound': 'Category not found.',
  'category.inUse': (name) => `${name} is in use and cannot be deleted`,
  'category.none': 'No category',
  'category.others': (count) => `Others (${count})`,

  'asset.institution': 'Enter the bank or broker.',
  'asset.name': 'Enter the asset name.',
  'asset.quantity': 'Enter a quantity greater than zero.',
  'asset.price': 'Enter the current quote.',
  'asset.avgPrice': 'Invalid average price.',
  'asset.current': 'Enter the current value.',
  'asset.invested': 'Invalid invested amount.',
  'asset.notFound': 'Asset not found.',
  'asset.class.reserva': 'Reserve',
  'asset.class.tesouro': 'Treasury bonds',
  'asset.class.garantia': 'Collateral',
  'asset.class.etf': 'ETFs',
  'asset.class.fii': 'Real estate funds',
  'asset.class.cripto': 'Crypto',
  'asset.class.cambio': 'Foreign currency',
  'asset.class.conta': 'Account and savings',

  'closing.review': (name, institution) => `Review the values of “${name}” (${institution}).`,
  'closing.stale':
    'This closing is no longer open or the portfolio changed. Reload the page and review again.',

  'recurring.noneSelected': 'Select at least one entry.',
  'recurring.review': (description, month) =>
    `Review “${description}”: the date must be in ${month} and the amount greater than zero.`,

  'settlement.description': 'Settlement of split bills',
  'settlement.shareTitle': (month) => `*Bill settlement — ${month}*`,
  'settlement.shareHeading': (sharePercent) => `Split bills (${sharePercent}% your share):`,
  'settlement.shareItem': (day, description, pending, total, part) =>
    `• ${day} ${description}${pending ? ' (pending)' : ''}: ${total} → ${part}`,
  'settlement.shareNoItems': '• No split bills this month',
  'settlement.shareTotal': (total) => `Total bills: ${total}`,
  'settlement.sharePartner': (partner, sharePercent, amount) =>
    `${partner}'s share (${sharePercent}%): ${amount}`,
  'settlement.shareReceived': (amount) => `Already received: ${amount}`,
  'settlement.shareScheduled': (amount) => `Already agreed: ${amount}`,
  'settlement.shareBalance': (amount) => `*Amount to settle: ${amount}*`,
  'settlement.entryNote': (partner, count, month) => `${partner} · ${count} bills from ${month}`,

  'transaction.notFound': 'Entry not found.',
  'transaction.splitOnlyExpenses': 'Only expenses can be split.',
  'recurring.stale': 'These entries were already generated. Reload the page and review again.',

  'api.sessionExpired': 'Session expired. Sign in again.',
  'api.routeNotFound': 'Route not found.',
  'api.invalidData': 'Invalid data.',
  'api.unexpected': 'Unexpected error. Try again.',

  'partner.default': 'Partner',

  'month.1': 'January',
  'month.2': 'February',
  'month.3': 'March',
  'month.4': 'April',
  'month.5': 'May',
  'month.6': 'June',
  'month.7': 'July',
  'month.8': 'August',
  'month.9': 'September',
  'month.10': 'October',
  'month.11': 'November',
  'month.12': 'December',
  'weekday.0': 'sun',
  'weekday.1': 'mon',
  'weekday.2': 'tue',
  'weekday.3': 'wed',
  'weekday.4': 'thu',
  'weekday.5': 'fri',
  'weekday.6': 'sat',

  'elapsed.now': 'now',
  'elapsed.minutes': (count) => `${count} min ago`,
  'elapsed.hours': (count) => `${count} h ago`,
  'elapsed.days': (count) => `${count} ${count === 1 ? 'day' : 'days'} ago`,

  'due.late': 'Overdue',
  'due.today': 'Today',
  'due.tomorrow': 'Tomorrow',
  'due.inDays': (count) => `In ${count} days`,
};
