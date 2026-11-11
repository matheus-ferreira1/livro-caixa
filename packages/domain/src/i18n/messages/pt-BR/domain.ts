/** Copy that the domain itself produces: validation messages, date words and shared labels. */
export const domainPtBR = {
  'login.missingFields': 'Informe e-mail e senha.',
  'login.invalidEmail': 'Digite um e-mail válido.',
  'login.invalidCredentials': 'E-mail ou senha incorretos.',
  'login.loggedOut': 'Você saiu da sua conta.',
  'login.lockedOut': (secondsLeft: number) => `Muitas tentativas. Tente de novo em ${secondsLeft} s.`,

  'form.date': 'Informe a data.',
  'form.description': 'Informe a descrição.',
  'form.value': 'Informe um valor maior que zero.',
  'form.category': 'Escolha uma categoria.',

  'category.nameRequired': 'Dê um nome para a categoria.',
  'category.duplicate': 'Já existe uma categoria com esse nome nesse tipo.',
  'category.notFound': 'Categoria não encontrada.',
  'category.inUse': (name: string) => `${name} está em uso e não pode ser excluída`,
  'category.none': 'Sem categoria',
  'category.others': (count: number) => `Outras (${count})`,

  'asset.institution': 'Informe o banco ou a corretora.',
  'asset.name': 'Informe o nome do ativo.',
  'asset.quantity': 'Informe uma quantidade maior que zero.',
  'asset.price': 'Informe a cotação atual.',
  'asset.avgPrice': 'Preço médio inválido.',
  'asset.current': 'Informe o valor atual.',
  'asset.invested': 'Valor aplicado inválido.',
  'asset.notFound': 'Ativo não encontrado.',
  'asset.class.reserva': 'Reserva',
  'asset.class.tesouro': 'Tesouro Direto',
  'asset.class.garantia': 'Garantias',
  'asset.class.etf': 'ETFs',
  'asset.class.fii': 'Fundos imobiliários',
  'asset.class.cripto': 'Cripto',
  'asset.class.cambio': 'Câmbio',
  'asset.class.conta': 'Conta e poupança',

  'closing.review': (name: string, institution: string) => `Revise os valores de “${name}” (${institution}).`,
  'closing.stale':
    'Esse fechamento não está mais em aberto ou a carteira mudou. Atualize a página e revise de novo.',

  'recurring.noneSelected': 'Selecione ao menos um lançamento.',
  'recurring.review': (description: string, month: string) =>
    `Revise “${description}”: a data deve ser em ${month} e o valor maior que zero.`,

  'settlement.description': 'Acerto das contas divididas',
  'settlement.shareTitle': (month: string) => `*Acerto de contas — ${month}*`,
  'settlement.shareHeading': (sharePercent: number) => `Contas divididas (${sharePercent}% sua parte):`,
  'settlement.shareItem': (day: string, description: string, pending: boolean, total: string, part: string) =>
    `• ${day} ${description}${pending ? ' (previsto)' : ''}: ${total} → ${part}`,
  'settlement.shareNoItems': '• Nenhuma conta dividida neste mês',
  'settlement.shareTotal': (total: string) => `Total das contas: ${total}`,
  'settlement.sharePartner': (partner: string, sharePercent: number, amount: string) =>
    `Parte de ${partner} (${sharePercent}%): ${amount}`,
  'settlement.shareReceived': (amount: string) => `Já recebido: ${amount}`,
  'settlement.shareScheduled': (amount: string) => `Já combinado: ${amount}`,
  'settlement.shareBalance': (amount: string) => `*Valor a acertar: ${amount}*`,
  'settlement.entryNote': (partner: string, count: number, month: string) =>
    `${partner} · ${count} contas de ${month}`,

  'transaction.notFound': 'Lançamento não encontrado.',
  'transaction.splitOnlyExpenses': 'Só despesas podem ser divididas.',
  'recurring.stale': 'Esses lançamentos já foram gerados. Atualize a página e revise de novo.',

  'api.sessionExpired': 'Sessão expirada. Entre novamente.',
  'api.routeNotFound': 'Rota não encontrada.',
  'api.invalidData': 'Dados inválidos.',
  'api.unexpected': 'Erro inesperado. Tente novamente.',

  'partner.default': 'Companheira',

  'month.1': 'Janeiro',
  'month.2': 'Fevereiro',
  'month.3': 'Março',
  'month.4': 'Abril',
  'month.5': 'Maio',
  'month.6': 'Junho',
  'month.7': 'Julho',
  'month.8': 'Agosto',
  'month.9': 'Setembro',
  'month.10': 'Outubro',
  'month.11': 'Novembro',
  'month.12': 'Dezembro',
  'weekday.0': 'dom',
  'weekday.1': 'seg',
  'weekday.2': 'ter',
  'weekday.3': 'qua',
  'weekday.4': 'qui',
  'weekday.5': 'sex',
  'weekday.6': 'sáb',

  'elapsed.now': 'agora',
  'elapsed.minutes': (count: number) => `há ${count} min`,
  'elapsed.hours': (count: number) => `há ${count} h`,
  'elapsed.days': (count: number) => `há ${count} ${count === 1 ? 'dia' : 'dias'}`,

  'due.late': 'Atrasado',
  'due.today': 'Hoje',
  'due.tomorrow': 'Amanhã',
  'due.inDays': (count: number) => `Em ${count} dias`,
};
