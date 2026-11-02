import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, signIn } from '../../test/harness';

const entry = {
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

const march = (body: { months: { month: string }[] }) => body.months.find((m) => m.month === '2026-03');

describe('GET /api/summary', () => {
  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).get('/api/summary?year=2026').expect(401);
  });

  test.each(['year=26', 'year=abcd', '', 'year=2026&mode=other'])('rejects the query "%s"', async (query) => {
    const { agent } = await signedIn();
    const { body } = await agent.get(`/api/summary?${query}`).expect(400);
    expect(body.error.code).toBe('validation_error');
  });

  test('counts confirmed entries only by default', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(entry).expect(201);
    const { body } = await agent.get('/api/summary?year=2026').expect(200);
    expect(body.mode).toBe('real');
    expect(body.months).toHaveLength(12);
    expect(march(body)).toMatchObject({ hasData: false, hasPending: true, expenseCents: 0 });
    expect(body.totals.activeMonths).toBe(0);
  });

  test('"proj" counts previstos and the expected acerto', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(entry).expect(201);
    const { body } = await agent.get('/api/summary?year=2026&mode=proj').expect(200);
    expect(march(body)).toMatchObject({
      hasData: true,
      expenseCents: 10_000,
      settlementCents: 5_000,
      balanceCents: -5_000,
    });
    expect(body.totals.bestMonth).toEqual({ month: '2026-03', balanceCents: -5_000 });
  });

  test('uses the partner share from the settings', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(entry).expect(201);
    await agent.put('/api/settings').send({ partnerName: 'Bia', partnerShare: 30 }).expect(200);
    const { body } = await agent.get('/api/summary?year=2026&mode=proj').expect(200);
    expect(march(body)).toMatchObject({ settlementCents: 3_000 });
  });
});
