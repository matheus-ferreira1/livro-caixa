/**
 * Loads the design prototype's sample ledger (Nov 2025 – Oct 2026) for development.
 * Usage: bun run seed:demo   (refuses to touch a database that already has entries)
 */
import { pad2, type Transaction, type TransactionType } from '@livro-caixa/domain';
import { bootstrap } from './bootstrap';
import { loadConfig } from './config';

const reais = (value: number) => Math.round(value * 100);

function tx(
  id: string,
  date: string,
  description: string,
  note: string,
  type: TransactionType,
  categoryId: string | null,
  value: number,
  split: boolean,
  confirmed: boolean,
  seriesId: string | null = null,
): Transaction {
  return {
    id,
    date,
    description,
    note,
    type,
    categoryId,
    valueCents: reais(value),
    split,
    confirmed,
    recurring: Boolean(seriesId),
    seriesId,
  };
}

interface Extra {
  day: number;
  description: string;
  type: TransactionType;
  categoryId: string;
  value: number;
}

const freela = (day: number, value: number): Extra => ({
  day,
  description: 'Freelance',
  type: 'receita',
  categoryId: 'c-freela',
  value,
});

const HISTORY: { card: number; market: number; power: number; water: number; extras: Extra[] }[] = [
  { card: 2610, market: 795.4, power: 228.6, water: 126.9, extras: [] },
  {
    card: 3380,
    market: 980.2,
    power: 241.5,
    water: 129.3,
    extras: [
      { day: 18, description: '13º salário', type: 'receita', categoryId: 'c-salario', value: 8500 },
      { day: 22, description: 'Presentes de Natal', type: 'despesa', categoryId: 'c-lazer', value: 1250 },
    ],
  },
  {
    card: 2840,
    market: 780,
    power: 268.4,
    water: 128.15,
    extras: [
      {
        day: 15,
        description: 'IPTU 2026 (cota única)',
        type: 'despesa',
        categoryId: 'c-moradia',
        value: 1650,
      },
    ],
  },
  { card: 1960, market: 745.2, power: 251.3, water: 131.8, extras: [freela(22, 1200)] },
  {
    card: 2210,
    market: 820.6,
    power: 239.1,
    water: 126.4,
    extras: [{ day: 12, description: 'IPVA 2026', type: 'despesa', categoryId: 'c-transporte', value: 2980 }],
  },
  { card: 3120, market: 790, power: 212.7, water: 122.9, extras: [] },
  { card: 1890, market: 860.3, power: 198.5, water: 135.2, extras: [freela(24, 2500)] },
  { card: 2450, market: 805, power: 205.6, water: 129.7, extras: [] },
  {
    card: 4380,
    market: 910.4,
    power: 221.2,
    water: 124.3,
    extras: [
      { day: 10, description: 'Viagem de férias', type: 'despesa', categoryId: 'c-lazer', value: 5200 },
    ],
  },
  { card: 2050, market: 770.9, power: 230.8, water: 133.6, extras: [freela(21, 1500)] },
  { card: 2290, market: 835.5, power: 240.3, water: 137.1, extras: [] },
];

const MONTHS = ['2025-11', '2025-12', ...Array.from({ length: 9 }, (_, i) => `2026-${pad2(i + 1)}`)];

function history(): Transaction[] {
  return HISTORY.flatMap((p, i) => {
    const key = MONTHS[i] ?? '';
    const day = (d: number) => `${key}-${pad2(d)}`;
    const id = (suffix: string) => `h${key}${suffix}`;
    const shared: [string, string, number, number, string][] = [
      ['Condomínio', 'c-moradia', 1, 690, 's-condominio'],
      ['Conta de água', 'c-agua', 10, p.water, 's-agua'],
      ['Conta de luz', 'c-energia', 12, p.power, 's-luz'],
      ['Internet fibra', 'c-internet', 15, 119.9, 's-internet'],
      ['Mercado do mês', 'c-mercado', 18, p.market, 's-mercado'],
    ];
    const sharedTotal = shared.reduce((acc, s) => acc + reais(s[3]), 0);
    return [
      tx(id('s'), day(5), 'Salário', 'Valor líquido', 'receita', 'c-salario', 8500, false, true, 's-salario'),
      tx(id('r'), day(8), 'Aluguel da kitnet', '', 'receita', 'c-aluguel', 1400, false, true, 's-aluguel'),
      ...shared.map(([description, category, d, value, series], j) =>
        tx(id(`d${j}`), day(d), description, '', 'despesa', category, value, true, true, series),
      ),
      tx(id('c'), day(20), 'Fatura do cartão', '', 'despesa', 'c-cartao', p.card, false, true, 's-cartao'),
      tx(id('p'), day(28), 'Plano de saúde', '', 'despesa', 'c-saude', 412, false, true, 's-saude'),
      ...p.extras.map((e, j) =>
        tx(id(`e${j}`), day(e.day), e.description, '', e.type, e.categoryId, e.value, false, true),
      ),
      tx(
        id('a'),
        day(26),
        'Acerto das contas divididas',
        'Companheira',
        'acerto',
        null,
        Math.round(sharedTotal / 2) / 100,
        false,
        true,
      ),
    ];
  });
}

const OCTOBER: Transaction[] = [
  tx('o1', '2026-10-01', 'Condomínio', '', 'despesa', 'c-moradia', 690, true, true, 's-condominio'),
  tx('o2', '2026-10-05', 'Salário', 'Valor líquido', 'receita', 'c-salario', 8500, false, true, 's-salario'),
  tx(
    'o3',
    '2026-10-08',
    'Aluguel da kitnet',
    'Inquilino pagou via Pix',
    'receita',
    'c-aluguel',
    1400,
    false,
    true,
    's-aluguel',
  ),
  tx(
    'o4',
    '2026-10-10',
    'Conta de água',
    'Leitura de 12/09 a 11/10',
    'despesa',
    'c-agua',
    138.42,
    true,
    true,
    's-agua',
  ),
  tx('o5', '2026-10-12', 'Conta de luz', '', 'despesa', 'c-energia', 246.9, true, true, 's-luz'),
  tx('o6', '2026-10-15', 'Internet fibra', '', 'despesa', 'c-internet', 119.9, true, true, 's-internet'),
  tx(
    'o7',
    '2026-10-18',
    'Mercado do mês',
    'Compra grande',
    'despesa',
    'c-mercado',
    812.35,
    true,
    true,
    's-mercado',
  ),
  tx(
    'o8',
    '2026-10-20',
    'Fatura do cartão',
    'Vencimento dia 20',
    'despesa',
    'c-cartao',
    2364.18,
    false,
    true,
    's-cartao',
  ),
  tx('o9', '2026-10-25', 'Freelance landing page', '', 'receita', 'c-freela', 1800, false, true),
  tx('o10', '2026-10-30', 'Feira e hortifrúti', '', 'despesa', 'c-mercado', 186.4, true, false),
  tx('o11', '2026-10-28', 'Plano de saúde', '', 'despesa', 'c-saude', 412, false, false, 's-saude'),
];

const container = bootstrap(loadConfig());
if (container.transactions.listAll().length > 0) {
  console.error('The database already has entries; demo data was not loaded.');
  process.exit(1);
}
const rows = [...history(), ...OCTOBER];
for (const row of rows) container.transactions.insert(row);
console.info(`Loaded ${rows.length} demo entries.`);
