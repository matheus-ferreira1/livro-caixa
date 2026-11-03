import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, signIn } from '../../test/harness';

const pendingSplitBill = {
  date: '2026-03-10',
  description: 'Conta de luz',
  note: '',
  type: 'despesa',
  categoryId: 'c-mercado',
  valueCents: 10_000,
  split: true,
  confirmed: false,
  recurring: false,
};

async function signedIn() {
  const ctx = await buildTestApp();
  await signIn(ctx.agent);
  return ctx;
}

describe('GET /api/dashboard', () => {
  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).get('/api/dashboard?month=2026-03').expect(401);
  });

  test.each(['', 'month=2026-13', 'month=abc', 'month=2026-03&mode=other'])(
    'rejects the query "%s"',
    async (query) => {
      const { agent } = await signedIn();
      const { body } = await agent.get(`/api/dashboard?${query}`).expect(400);
      expect(body.error.code).toBe('validation_error');
    },
  );

  test('counts confirmed entries only by default', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(pendingSplitBill).expect(201);
    const { body } = await agent.get('/api/dashboard?month=2026-03').expect(200);
    expect(body).toMatchObject({ month: '2026-03', mode: 'real' });
    expect(body.series).toHaveLength(12);
    expect(body.series[11]).toMatchObject({ month: '2026-03', expenseCents: 0 });
    expect(body.categories.totalCents).toBe(0);
  });

  test('"proj" counts previstos and names their categories', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(pendingSplitBill).expect(201);
    const { body } = await agent.get('/api/dashboard?month=2026-03&mode=proj').expect(200);
    expect(body.series[11]).toMatchObject({ expenseCents: 10_000, settlementCents: 5_000 });
    expect(body.kpis.balance).toMatchObject({ hasData: true, cents: -5_000 });
    expect(body.categories.slices).toHaveLength(1);
    expect(body.categories.slices[0].name).toBeTruthy();
    expect(body.categories.slices[0].name).not.toBe('Sem categoria');
  });

  test('open items and the acerto card ignore the mode', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(pendingSplitBill).expect(201);
    const { body } = await agent.get('/api/dashboard?month=2026-03').expect(200);
    expect(body.open).toMatchObject({ count: 1, outflowCents: 10_000, inflowCents: 0 });
    expect(body.open.items[0]).toMatchObject({ description: 'Conta de luz', date: '2026-03-10' });
    expect(body.settlement).toMatchObject({ status: 'pending', expectedCents: 5_000, pendingCents: 5_000 });
  });

  test('uses the partner name and share from the settings', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(pendingSplitBill).expect(201);
    await agent.put('/api/settings').send({ partnerName: 'Bia', partnerShare: 30 }).expect(200);
    const { body } = await agent.get('/api/dashboard?month=2026-03').expect(200);
    expect(body.partnerName).toBe('Bia');
    expect(body.settlement.expectedCents).toBe(3_000);
  });
});
