import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import type { Transaction } from '@livro-caixa/domain';
import { buildTestApp, signIn } from '../../test/harness';

async function appWith(transactions: Partial<Transaction>[]) {
  const ctx = await buildTestApp();
  for (const t of transactions) ctx.container.transactions.insert(aRow(t));
  await signIn(ctx.agent);
  return ctx;
}

let n = 0;
function aRow(overrides: Partial<Transaction>): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    date: '2026-10-10',
    description: `Item ${n}`,
    note: '',
    type: 'despesa',
    categoryId: 'c-mercado',
    valueCents: 1_000,
    split: false,
    confirmed: true,
    recurring: false,
    seriesId: null,
    ...overrides,
  };
}

describe('authorization', () => {
  test('every data endpoint requires a session', async () => {
    const { app } = await buildTestApp();
    for (const path of [
      '/api/transactions?month=2026-10',
      '/api/transactions/search',
      '/api/categories',
      '/api/settings',
    ]) {
      await request(app).get(path).expect(401);
    }
    await request(app).delete('/api/transactions/x').expect(401);
  });
});

describe('GET /api/categories and /api/settings', () => {
  test('returns the seeded default categories and split settings', async () => {
    const { agent } = await appWith([]);
    const { body } = await agent.get('/api/categories').expect(200);
    expect(body.categories).toHaveLength(12);
    expect(body.categories).toContainEqual({
      id: 'c-moradia',
      name: 'Moradia',
      type: 'despesa',
      color: '#EB6834',
    });
    const settings = await agent.get('/api/settings').expect(200);
    expect(settings.body.settings).toEqual({ partnerName: 'Companheira', partnerShare: 50 });
  });
});

describe('GET /api/transactions?month=', () => {
  test('returns only the requested month', async () => {
    const { agent } = await appWith([
      { id: 'oct', date: '2026-10-31' },
      { id: 'nov', date: '2026-11-01' },
    ]);
    const { body } = await agent.get('/api/transactions?month=2026-10').expect(200);
    expect(body.transactions.map((t: Transaction) => t.id)).toEqual(['oct']);
    expect(body.transactions[0]).toMatchObject({ valueCents: 1_000, split: false, confirmed: true });
  });

  test('rejects a malformed month', async () => {
    const { agent } = await appWith([]);
    await agent.get('/api/transactions?month=2026-13').expect(400);
  });
});

describe('GET /api/transactions/search', () => {
  test('filters, sorts, paginates and totals across all months', async () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      aRow({ id: `r${i}`, date: `2026-${i < 15 ? '09' : '10'}-${String((i % 15) + 1).padStart(2, '0')}` }),
    );
    const { agent } = await appWith([
      ...rows,
      { id: 'inc', type: 'receita', categoryId: 'c-salario', valueCents: 50_000 },
    ]);

    const { body } = await agent
      .get('/api/transactions/search')
      .query({ type: 'despesa', sort: 'date', dir: 'desc', page: 2, pageSize: 25 })
      .expect(200);
    expect(body.total).toBe(30);
    expect(body.page).toBe(2);
    expect(body.totalPages).toBe(2);
    expect(body.items).toHaveLength(5);
    expect(body.items[0].date).toBe('2026-09-05');
    expect(body.totals).toEqual({
      incomeCents: 0,
      expenseCents: 30_000,
      settlementCents: 0,
      balanceCents: -30_000,
    });
    expect(body.groups).toEqual([
      { monthKey: '2026-09', count: 15, netCents: -15_000, ids: body.items.map((t: Transaction) => t.id) },
    ]);
  });

  test('supports date range, category and text search', async () => {
    const { agent } = await appWith([
      { id: 'a', date: '2026-01-15', description: 'Conta de luz', categoryId: 'c-energia' },
      { id: 'b', date: '2026-06-15', description: 'Conta de luz', categoryId: 'c-energia' },
      { id: 'c', date: '2026-06-20', description: 'Acerto', type: 'acerto', categoryId: null },
    ]);
    const ids = async (query: Record<string, string>) =>
      (await agent.get('/api/transactions/search').query(query).expect(200)).body.items.map(
        (t: Transaction) => t.id,
      );
    expect(await ids({ from: '2026-06-01', q: 'luz' })).toEqual(['b']);
    expect(await ids({ category: 'none' })).toEqual(['c']);
    expect(await ids({ category: 'c-energia', sort: 'date', dir: 'asc' })).toEqual(['a', 'b']);
  });
});

describe('PATCH /api/transactions/:id', () => {
  test('toggles status and split', async () => {
    const { agent } = await appWith([{ id: 'x', confirmed: false }]);
    const { body } = await agent
      .patch('/api/transactions/x')
      .send({ confirmed: true, split: true })
      .expect(200);
    expect(body.transaction).toMatchObject({ id: 'x', confirmed: true, split: true });
  });

  test('refuses to split anything but an expense', async () => {
    const { agent } = await appWith([{ id: 'inc', type: 'receita', categoryId: 'c-salario' }]);
    const res = await agent.patch('/api/transactions/inc').send({ split: true }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  test('404s for unknown entries', async () => {
    const { agent } = await appWith([]);
    await agent.patch('/api/transactions/nope').send({ confirmed: true }).expect(404);
  });
});

describe('DELETE /api/transactions/:id', () => {
  test('removes the entry', async () => {
    const { agent } = await appWith([{ id: 'gone' }]);
    await agent.delete('/api/transactions/gone').expect(204);
    const { body } = await agent.get('/api/transactions?month=2026-10').expect(200);
    expect(body.transactions).toEqual([]);
    await agent.delete('/api/transactions/gone').expect(404);
  });
});
