import type { Transaction } from '../transactions/transaction';
import type { AutoAsset, ManualAsset, Snapshot } from '../wealth/asset';

let sequence = 0;

/** Test-data builder: a confirmed, unsplit despesa unless overridden. */
export function aTransaction(overrides: Partial<Transaction> = {}): Transaction {
  sequence += 1;
  return {
    id: `t${sequence}`,
    date: '2026-10-10',
    description: `Lançamento ${sequence}`,
    note: '',
    type: 'despesa',
    categoryId: 'c-mercado',
    valueCents: 10_000,
    split: false,
    confirmed: true,
    recurring: false,
    seriesId: null,
    ...overrides,
  };
}

/** Test-data builder: 1 unit at R$ 100,00, with no average price and no daily change. */
export function anAutoAsset(overrides: Partial<AutoAsset> = {}): AutoAsset {
  sequence += 1;
  return {
    id: `a${sequence}`,
    institution: 'XP',
    name: `Ativo ${sequence}`,
    assetClass: 'fii',
    pricing: 'auto',
    quantityE8: 100_000_000,
    avgPriceCents: null,
    priceCents: 10_000,
    dayChangeBps: null,
    quotedAt: null,
    quoteFailed: false,
    updatedAt: '2026-10-28',
    ...overrides,
  };
}

/** Test-data builder: worth R$ 100,00 with an unknown invested amount. */
export function aManualAsset(overrides: Partial<ManualAsset> = {}): ManualAsset {
  sequence += 1;
  return {
    id: `a${sequence}`,
    institution: 'XP',
    name: `Ativo ${sequence}`,
    assetClass: 'reserva',
    pricing: 'manual',
    investedCents: null,
    currentCents: 10_000,
    updatedAt: '2026-10-28',
    ...overrides,
  };
}

export function aSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { month: '2026-09', totalCents: 100_000, contributionsCents: 0, ...overrides };
}
