import type { summaryPtBR } from '../pt-BR/summary';

export const summaryEn: typeof summaryPtBR = {
  'summary.eyebrow': 'Monthly summary',
  'summary.previousYear': 'Previous year',
  'summary.nextYear': 'Next year',
  'summary.modeLabel': 'Amounts counted',
  'summary.modeReal': 'Actual',
  'summary.modeProj': 'With pending',
  'summary.hintReal': 'Confirmed entries only.',
  'summary.hintProj': 'Includes pending entries and the expected settlement of split bills.',
  'summary.footnote':
    'Balance = income + settlements − expenses. The settlement counts toward the balance because it offsets the share of split bills you paid, but it does not count as income.',

  'summary.statusEmpty': 'No entries',
  'summary.statusOpen': 'Open',
  'summary.statusClosed': 'Closed',

  'summary.tileIncome': 'Income this year',
  'summary.tileIncomeSub': (settlement) => `Plus ${settlement} in settlements`,
  'summary.tileExpense': 'Expenses this year',
  'summary.tileExpenseSub': (average) => `Average of ${average} per month`,
  'summary.tileAverage': 'Average monthly balance',
  'summary.tileAverageSub': (months) => `Over ${months} ${months === 1 ? 'month' : 'months'} with entries`,
  'summary.tileAverageNone': 'No month with entries',
  'summary.tileAccumulated': 'Accumulated this year',
  'summary.tileAccumulatedBest': (month, balance) => `Best month: ${month} (${balance})`,
  'summary.tileAccumulatedNone': 'No entries this year',

  'summary.barLabel': (month, balance) => `${month}: balance of ${balance}`,
  'summary.openMonth': (month) => `View entries for ${month}`,

  'summary.chartTitle': 'Balance by month',
  'summary.legendSurplus': 'Surplus',
  'summary.legendDeficit': 'Shortfall',
  'summary.legendPending': 'Month with pending',

  'summary.tableLabel': 'Monthly summary table',
  'summary.colMonth': 'Month',
  'summary.colIncome': 'Income',
  'summary.colExpense': 'Expenses',
  'summary.colSettlement': 'Settlements',
  'summary.colBalance': 'Balance',
  'summary.colAccumulated': 'Accumulated',
  'summary.colStatus': 'Status',
  'summary.current': 'Current',
  'summary.total': (year) => `Total ${year}`,
};
