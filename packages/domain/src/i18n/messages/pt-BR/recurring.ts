/** Recorrentes: the banner on Lançamentos and the review dialog. */
export const recurringPtBR = {
  'recurring.banner': (count: number, month: string) =>
    `${
      count === 1
        ? '1 lançamento recorrente ainda não foi gerado'
        : `${count} lançamentos recorrentes ainda não foram gerados`
    } para ${month}.`,
  'recurring.bannerHelp': 'Eles entram como previstos, com data e valor do último mês, para você ajustar.',
  'recurring.dismiss': 'Agora não',
  'recurring.reviewAndGenerate': 'Revisar e gerar',

  'recurring.dialogTitle': 'Gerar lançamentos recorrentes',
  'recurring.dialogDescription': (month: string) =>
    `${month} · a partir da última ocorrência de cada lançamento recorrente`,
  'recurring.introBefore': 'Os lançamentos entram como ',
  'recurring.introStrong': 'previstos',
  'recurring.introAfter':
    ', sem observação. Ajuste datas e valores aqui ou depois, direto na lista. Desmarque o que não acontece neste mês.',
  'recurring.selectAll': 'Selecionar todos',
  'recurring.columnEntry': 'Lançamento',
  'recurring.columnType': 'Tipo',
  'recurring.columnDate': 'Data',
  'recurring.columnValue': (symbol: string) => `Valor (${symbol})`,
  'recurring.columnLast': 'Último lançado',
  'recurring.allDoneTitle': 'Tudo em dia',
  'recurring.allDoneText': (month: string) => `Todos os lançamentos recorrentes já estão em ${month}.`,
  'recurring.selected': (count: number, total: number) => `${count} de ${total} selecionados`,
  'recurring.cancel': 'Cancelar',
  'recurring.generate': (count: number) => `Gerar ${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`,
  'recurring.generateNone': 'Gerar lançamentos',
  'recurring.generated': (count: number) =>
    `${count} ${count === 1 ? 'lançamento gerado' : 'lançamentos gerados'} como previstos`,
  'recurring.includeRow': (description: string) => `Incluir ${description}`,
  'recurring.dateRow': (description: string) => `Data de ${description}`,
  'recurring.valueRow': (description: string) => `Valor de ${description}`,
  'recurring.splitSuffix': ' · dividida',
};
