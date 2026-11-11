export const summaryPtBR = {
  'summary.eyebrow': 'Resumo mensal',
  'summary.previousYear': 'Ano anterior',
  'summary.nextYear': 'Próximo ano',
  'summary.modeLabel': 'Valores considerados',
  'summary.modeReal': 'Realizado',
  'summary.modeProj': 'Com previstos',
  'summary.hintReal': 'Só lançamentos confirmados.',
  'summary.hintProj': 'Inclui previstos e o acerto esperado das contas divididas.',
  'summary.footnote':
    'Balanço = receitas + acertos − despesas. O acerto entra no balanço porque compensa a parte das contas divididas que você pagou, mas não conta como receita.',

  'summary.statusEmpty': 'Sem lançamentos',
  'summary.statusOpen': 'Em aberto',
  'summary.statusClosed': 'Fechado',

  'summary.tileIncome': 'Receitas no ano',
  'summary.tileIncomeSub': (settlement: string) => `Mais ${settlement} em acertos`,
  'summary.tileExpense': 'Despesas no ano',
  'summary.tileExpenseSub': (average: string) => `Média de ${average} por mês`,
  'summary.tileAverage': 'Média de balanço mensal',
  'summary.tileAverageSub': (months: number) =>
    `Em ${months} ${months === 1 ? 'mês' : 'meses'} com lançamentos`,
  'summary.tileAverageNone': 'Nenhum mês com lançamentos',
  'summary.tileAccumulated': 'Acumulado no ano',
  'summary.tileAccumulatedBest': (month: string, balance: string) => `Melhor mês: ${month} (${balance})`,
  'summary.tileAccumulatedNone': 'Sem lançamentos no ano',

  'summary.barLabel': (month: string, balance: string) => `${month}: balanço de ${balance}`,
  'summary.openMonth': (month: string) => `Ver lançamentos de ${month}`,

  'summary.chartTitle': 'Balanço por mês',
  'summary.legendSurplus': 'Sobrou',
  'summary.legendDeficit': 'Faltou',
  'summary.legendPending': 'Mês com previstos',

  'summary.tableLabel': 'Tabela do resumo mensal',
  'summary.colMonth': 'Mês',
  'summary.colIncome': 'Receitas',
  'summary.colExpense': 'Despesas',
  'summary.colSettlement': 'Acertos',
  'summary.colBalance': 'Balanço',
  'summary.colAccumulated': 'Acumulado',
  'summary.colStatus': 'Situação',
  'summary.current': 'Atual',
  'summary.total': (year: number) => `Total ${year}`,
};
