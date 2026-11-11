export const settingsPtBR = {
  'settings.eyebrow': 'Preferências',

  'settings.categoriesTitle': 'Categorias',
  'settings.categoriesIntro':
    'Categorias organizam receitas e despesas. Acertos não usam categoria. Uma categoria em uso não pode ser excluída, só renomeada.',
  'settings.typeIncome': 'Receita',
  'settings.typeExpense': 'Despesa',
  'settings.listIncome': 'Receitas',
  'settings.listExpense': 'Despesas',
  'settings.newCategory': 'Nova categoria',
  'settings.newCategoryPlaceholder': 'Ex.: Pets, Academia, Gás',
  'settings.type': 'Tipo',
  'settings.newCategoryType': 'Tipo da nova categoria',
  'settings.color': 'Cor',
  'settings.newCategoryColor': 'Cor da nova categoria',
  'settings.categoryColor': 'Cor da categoria',
  'settings.colorSwatch': (position: number) => `Cor ${position}`,
  'settings.add': 'Adicionar',
  'settings.name': 'Nome',
  'settings.cancel': 'Cancelar',
  'settings.save': 'Salvar',
  'settings.edit': (name: string) => `Editar ${name}`,
  'settings.delete': (name: string) => `Excluir ${name}`,
  'settings.noEntries': 'Sem lançamentos',
  'settings.entryCount': (count: number) => `${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`,
  'settings.categoryCount': (count: number) => `${count} ${count === 1 ? 'categoria' : 'categorias'}`,
  'settings.categoryCreated': (name: string) => `Categoria “${name}” criada`,
  'settings.categoryUpdated': 'Categoria atualizada',
  'settings.categoryDeleted': (name: string) => `Categoria “${name}” excluída`,

  'settings.splitTitle': 'Divisão de contas',
  'settings.splitIntro':
    'Define quem divide as contas marcadas como “dividido” e a parte de cada um. É a base do cálculo do acerto.',
  'settings.partnerName': 'Nome do(a) companheiro(a)',
  'settings.partnerShare': (partnerName: string) => `Parte de ${partnerName} nas contas divididas`,
  'settings.splitExample': (total: string, partnerName: string, partner: string, mine: string) =>
    `Exemplo: numa conta dividida de ${total}, ${partnerName} paga ${partner} e você paga ${mine}.`,

  'settings.preferencesTitle': 'Idioma e moeda',
  'settings.preferencesIntro':
    'Define o idioma da interface e como os valores são exibidos. Os valores não são convertidos.',
  'settings.language': 'Idioma',
  'settings.currency': 'Moeda',
  'settings.currencyBRL': 'Real brasileiro (R$)',
  'settings.currencyUSD': 'Dólar americano ($)',
  'settings.currencyEUR': 'Euro (€)',
  'settings.currencyGBP': 'Libra esterlina (£)',
};
