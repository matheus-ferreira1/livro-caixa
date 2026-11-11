/** The Acerto de contas dialog. The shared text of the message itself lives in the domain section. */
export const settlementPtBR = {
  'settlement.dialogTitle': 'Acerto de contas',
  'settlement.dialogDescription': (month: string, partner: string) =>
    `${month} · contas divididas com ${partner}`,
  'settlement.registered': 'Acerto registrado como previsto. Confirme quando receber.',
  'settlement.whenSent': (partner: string) => `Quando ${partner} enviar o valor`,
  'settlement.registerHelp':
    'Registre o acerto como previsto agora e marque como confirmado quando o dinheiro cair.',
  'settlement.registerAmount': (amount: string) => `Registrar acerto de ${amount}`,
  'settlement.alreadyRegistered': 'Acerto do mês já registrado',

  'settlement.printSummary': 'Resumo para print',
  'settlement.printHeader': (month: string) => `Acerto · ${month}`,
  'settlement.amountDue': (partner: string) => `Valor a acertar por ${partner}`,
  'settlement.columnBill': 'Conta',
  'settlement.columnTotal': 'Total',
  'settlement.columnPartner': (partner: string) => `Parte ${partner}`,
  'settlement.noBills': 'Nenhuma conta dividida neste mês.',
  'settlement.totalBills': 'Total das contas divididas',
  'settlement.mineShare': (percent: number) => `Minha parte (${percent}%)`,
  'settlement.partnerShare': (partner: string, percent: number) => `Parte de ${partner} (${percent}%)`,
  'settlement.alreadyReceived': 'Já recebido',
  'settlement.alreadyScheduled': 'Já registrado como previsto',
  'settlement.pendingTag': 'previsto',
  'settlement.footnote': (
    minePercent: number,
    partnerPercent: number,
    count: number,
    includePending: boolean,
  ) =>
    `Divisão ${minePercent}% / ${partnerPercent}% · ${count} contas · ${
      includePending ? 'inclui previstas' : 'só confirmadas'
    }`,

  'settlement.includePendingTitle': 'Incluir contas previstas',
  'settlement.includePendingHelp': 'Útil para avisar o valor antes de todas as contas vencerem.',
  'settlement.messageLabel': 'Mensagem em texto',
  'settlement.copy': 'Copiar texto',
  'settlement.copied': 'Copiado!',
  'settlement.whatsapp': 'Enviar no WhatsApp',
  'settlement.copyFailed': 'Não foi possível copiar automaticamente. Selecione o texto acima e copie.',
};
