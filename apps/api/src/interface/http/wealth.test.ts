import { describe, expect, test } from 'bun:test';
import { ASSET_MESSAGES } from '@livro-caixa/domain';
import request from 'supertest';
import { buildTestApp, signIn } from '../../test/harness';

const TODAY = '2026-11-03';

const manualAsset = {
  institution: 'XP',
  name: 'Tesouro 27',
  assetClass: 'tesouro',
  pricing: 'manual',
  quantityE8: null,
  avgPriceCents: null,
  priceCents: null,
  investedCents: 98_080,
  currentCents: 161_511,
  today: TODAY,
};

const autoAsset = {
  institution: 'XP',
  name: 'MXRF11',
  assetClass: 'fii',
  pricing: 'auto',
  quantityE8: 300_000_000,
  avgPriceCents: 1025,
  priceCents: 894,
  investedCents: null,
  currentCents: null,
  today: TODAY,
};

async function signedIn() {
  const ctx = await buildTestApp();
  await signIn(ctx.agent);
  return ctx;
}

describe('GET /api/wealth', () => {
  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).get(`/api/wealth?today=${TODAY}`).expect(401);
  });

  test.each(['', 'today=2026-1-1', 'today=abc'])('rejects the query "%s"', async (query) => {
    const { agent } = await signedIn();
    const { body } = await agent.get(`/api/wealth?${query}`).expect(400);
    expect(body.error.code).toBe('validation_error');
  });

  test('is empty for a new portfolio, open on the previous month', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(body).toMatchObject({ totalCents: 0, assets: [], openMonth: '2026-10' });
    expect(body.kpis.lastClosing).toBeNull();
    expect(body.evolution.points).toHaveLength(1);
  });

  test('values the portfolio and reads the closings in order', async () => {
    const { agent, container } = await signedIn();
    await agent.post('/api/assets').send(manualAsset).expect(201);
    await agent.post('/api/assets').send(autoAsset).expect(201);
    container.snapshots.insert({ month: '2026-09', totalCents: 150_000, contributionsCents: 1000 });
    container.snapshots.insert({ month: '2026-08', totalCents: 140_000, contributionsCents: 500 });

    const { body } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);

    expect(body.totalCents).toBe(161_511 + 2682);
    expect(body.investedCents).toBe(98_080 + 3075);
    expect(body.openMonth).toBe('2026-10');
    expect(body.kpis.lastClosing).toMatchObject({ month: '2026-09', changeCents: 10_000, yieldCents: 9000 });
    expect(body.assets.map((a: { name: string }) => a.name)).toEqual(['Tesouro 27', 'MXRF11']);
  });
});

describe('POST /api/assets', () => {
  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).post('/api/assets').send(manualAsset).expect(401);
  });

  test('stores a manual asset dated with the client date', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/assets').send(manualAsset).expect(201);
    expect(body.asset).toMatchObject({
      name: 'Tesouro 27',
      pricing: 'manual',
      investedCents: 98_080,
      currentCents: 161_511,
      updatedAt: TODAY,
    });
    expect(body.asset.id).toBeString();
  });

  test('stores an automatic asset', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/assets').send(autoAsset).expect(201);
    expect(body.asset).toMatchObject({
      pricing: 'auto',
      quantityE8: 300_000_000,
      avgPriceCents: 1025,
      priceCents: 894,
      dayChangeBps: null,
    });
  });

  test.each([
    [{ ...manualAsset, institution: ' ' }, ASSET_MESSAGES.institution],
    [{ ...manualAsset, name: '' }, ASSET_MESSAGES.name],
    [{ ...manualAsset, currentCents: null }, ASSET_MESSAGES.current],
    [{ ...manualAsset, investedCents: -1 }, ASSET_MESSAGES.invested],
    [{ ...autoAsset, quantityE8: 0 }, ASSET_MESSAGES.quantity],
    [{ ...autoAsset, priceCents: null }, ASSET_MESSAGES.price],
    [{ ...autoAsset, avgPriceCents: -1 }, ASSET_MESSAGES.avgPrice],
  ])('answers 400 with the design message for %j', async (asset, message) => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/assets').send(asset).expect(400);
    expect(body.error.message).toBe(message);
  });

  test.each([
    { ...manualAsset, assetClass: 'acoes' },
    { ...manualAsset, pricing: 'other' },
    { ...manualAsset, currentCents: 1.5 },
    { ...manualAsset, today: 'ontem' },
  ])('rejects the malformed body %j', async (asset) => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/assets').send(asset).expect(400);
    expect(body.error.code).toBe('validation_error');
  });
});

describe('PUT /api/assets/:id', () => {
  test('replaces the asset', async () => {
    const { agent } = await signedIn();
    const { body: created } = await agent.post('/api/assets').send(manualAsset).expect(201);

    const { body } = await agent
      .put(`/api/assets/${created.asset.id}`)
      .send({ ...manualAsset, name: 'Tesouro 2027', currentCents: 170_000, today: '2026-11-04' })
      .expect(200);

    expect(body.asset).toMatchObject({
      name: 'Tesouro 2027',
      currentCents: 170_000,
      updatedAt: '2026-11-04',
    });
    const { body: wealth } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(wealth.totalCents).toBe(170_000);
  });

  test('can switch the pricing mode', async () => {
    const { agent } = await signedIn();
    const { body: created } = await agent.post('/api/assets').send(manualAsset).expect(201);

    await agent.put(`/api/assets/${created.asset.id}`).send(autoAsset).expect(200);

    const { body: wealth } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(wealth.assets[0]).toMatchObject({ pricing: 'auto', priceCents: 894 });
    expect(wealth.assets[0]).not.toHaveProperty('currentCents');
  });

  test('answers 404 for an unknown asset', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.put('/api/assets/nope').send(manualAsset).expect(404);
    expect(body.error.message).toBe(ASSET_MESSAGES.notFound);
  });
});

describe('DELETE /api/assets/:id', () => {
  test('removes the asset', async () => {
    const { agent } = await signedIn();
    const { body: created } = await agent.post('/api/assets').send(manualAsset).expect(201);

    await agent.delete(`/api/assets/${created.asset.id}`).expect(204);

    const { body: wealth } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(wealth.assets).toEqual([]);
  });

  test('answers 404 for an unknown asset', async () => {
    const { agent } = await signedIn();
    await agent.delete('/api/assets/nope').expect(404);
  });
});
