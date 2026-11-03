/**
 * Loads the design prototype's sample ledger (Nov 2025 – Oct 2026) for development.
 * Usage: bun run seed:demo   (refuses to touch a database that already has entries)
 */
import {
  BASIS_POINTS,
  pad2,
  QUANTITY_SCALE,
  type Asset,
  type AssetClass,
  type Snapshot,
  type Transaction,
  type TransactionType,
} from '@livro-caixa/domain';
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

const ASSET_DATE = '2026-10-28';

function autoAsset(
  id: string,
  institution: string,
  name: string,
  assetClass: AssetClass,
  quantity: number,
  avgPrice: number | null,
  price: number,
  dayChange: number,
): Asset {
  return {
    id,
    institution,
    name,
    assetClass,
    pricing: 'auto',
    quantityE8: Math.round(quantity * QUANTITY_SCALE),
    avgPriceCents: avgPrice === null ? null : reais(avgPrice),
    priceCents: reais(price),
    dayChangeBps: Math.round(dayChange * BASIS_POINTS),
    updatedAt: ASSET_DATE,
  };
}

function manualAsset(
  id: string,
  institution: string,
  name: string,
  assetClass: AssetClass,
  invested: number | null,
  current: number,
): Asset {
  return {
    id,
    institution,
    name,
    assetClass,
    pricing: 'manual',
    investedCents: invested === null ? null : reais(invested),
    currentCents: reais(current),
    updatedAt: ASSET_DATE,
  };
}

const ASSETS: Asset[] = [
  autoAsset('a1', 'Binance', 'ETH-BRL', 'cripto', 0.0038961, 23076.24, 13937.69, -0.021),
  autoAsset('a2', 'Coinext', 'ADA-BRL', 'cripto', 3.52, 7.07, 1.26, 0.034),
  autoAsset('a3', 'Coinext', 'XRP-BRL', 'cripto', 1.28952, 7.8, 7.73, -0.008),
  autoAsset('a4', 'XP', 'MXRF11', 'fii', 3, 10.25, 8.94, 0.002),
  autoAsset('a5', 'Clear', 'LFTB11', 'etf', 6, 116.5, 128.3, 0.0003),
  manualAsset('a6', 'Genial', 'Saldo', 'conta', 0, 0),
  manualAsset('a7', 'BB', 'Caução', 'garantia', 6850, 6850),
  manualAsset('a8', 'BB', 'Poupança', 'conta', 0.05, 0.05),
  manualAsset('a9', 'XP', 'Tesouro 27', 'tesouro', 980.8, 1615.11),
  manualAsset('a10', 'XP', 'Tesouro 29', 'tesouro', 3387.8, 5443.32),
  manualAsset('a11', 'XP', 'Investback', 'conta', 130.09, 131.48),
  manualAsset('a12', 'XP', 'Acumulado', 'conta', null, 51.1),
  manualAsset('a13', 'Caixa', 'Poupança', 'conta', 0.01, 0.01),
  manualAsset('a14', 'Nubank', 'Reserva', 'reserva', 608.81, 1691.16),
  manualAsset('a15', 'Nubank', 'Reserva (uv)', 'reserva', 4531.01, 10012.19),
  autoAsset('a16', 'Wise', 'Dólar', 'cambio', 4.89, null, 5.19, -0.004),
];

const SNAPSHOTS: Snapshot[] = (
  [
    ['2025-10', 17460, 0],
    ['2025-11', 18240, 650],
    ['2025-12', 19105.4, 700],
    ['2026-01', 19872.1, 600],
    ['2026-02', 20418.75, 450],
    ['2026-03', 21195.3, 600],
    ['2026-04', 21980.6, 600],
    ['2026-05', 22655.2, 500],
    ['2026-06', 23241.9, 450],
    ['2026-07', 23608.45, 200],
    ['2026-08', 24395.1, 600],
    ['2026-09', 25481.7, 800],
  ] as const
).map(([month, total, contributions]) => ({
  month,
  totalCents: reais(total),
  contributionsCents: reais(contributions),
}));

const container = bootstrap(loadConfig());
const ledgerIsEmpty = container.transactions.listAll().length === 0;
const portfolioIsEmpty = container.assets.list().length === 0 && container.snapshots.list().length === 0;
if (!ledgerIsEmpty && !portfolioIsEmpty) {
  console.error('The database already has entries; demo data was not loaded.');
  process.exit(1);
}
// Each part has its own check, so a dev database from before Patrimônio can still get its portfolio.
if (ledgerIsEmpty) {
  const rows = [...history(), ...OCTOBER];
  for (const row of rows) container.transactions.insert(row);
  console.info(`Loaded ${rows.length} demo entries.`);
}
if (portfolioIsEmpty) {
  for (const asset of ASSETS) container.assets.insert(asset);
  for (const snapshot of SNAPSHOTS) container.snapshots.insert(snapshot);
  console.info(`Loaded ${ASSETS.length} demo assets and ${SNAPSHOTS.length} closings.`);
}
