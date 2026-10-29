import type { Transaction } from '../transactions/transaction';

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
