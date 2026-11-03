import { describe, expect, test } from 'bun:test';
import { ASSET_MESSAGES, CLOSING_MESSAGES } from '@livro-caixa/domain';
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

describe('POST /api/wealth/closings', () => {
  async function withManualAsset() {
    const ctx = await signedIn();
    const { body } = await ctx.agent.post('/api/assets').send(manualAsset).expect(201);
    return { ...ctx, assetId: body.asset.id as string };
  }

  const closing = (assetId: string, overrides = {}) => ({
    month: '2026-10',
    today: TODAY,
    items: [{ assetId, flowCents: 5000, currentCents: 170_000 }],
    ...overrides,
  });

  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).post('/api/wealth/closings').send(closing('a')).expect(401);
  });

  test('registers the first closing and updates the manual asset', async () => {
    const { agent, assetId } = await withManualAsset();
    await agent.post('/api/assets').send(autoAsset).expect(201);

    const { body } = await agent.post('/api/wealth/closings').send(closing(assetId)).expect(201);

    expect(body.snapshot).toEqual({ month: '2026-10', totalCents: 170_000 + 2682, contributionsCents: 5000 });
    const { body: wealth } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(wealth.openMonth).toBe('2026-11');
    expect(wealth.closingAvailable).toBe(false);
    expect(wealth.assets[0]).toMatchObject({
      currentCents: 170_000,
      investedCents: 98_080 + 5000,
      updatedAt: TODAY,
    });
  });

  test('refuses a second closing of the same month', async () => {
    const { agent, assetId } = await withManualAsset();
    await agent.post('/api/wealth/closings').send(closing(assetId)).expect(201);
    const { body } = await agent.post('/api/wealth/closings').send(closing(assetId)).expect(409);
    expect(body.error.message).toBe(CLOSING_MESSAGES.stale);
  });

  test('refuses the next closing before the 25th and accepts it from then on', async () => {
    const { agent, assetId } = await withManualAsset();
    await agent.post('/api/wealth/closings').send(closing(assetId)).expect(201);
    const next = { month: '2026-11', today: '2026-11-24' };
    await agent.post('/api/wealth/closings').send(closing(assetId, next)).expect(409);
    await agent
      .post('/api/wealth/closings')
      .send(closing(assetId, { ...next, today: '2026-11-25' }))
      .expect(201);
  });

  test('refuses a month that is not the open one', async () => {
    const { agent, assetId } = await withManualAsset();
    await agent
      .post('/api/wealth/closings')
      .send(closing(assetId, { month: '2026-09' }))
      .expect(409);
  });

  test('refuses a portfolio with no assets and no closings', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/wealth/closings').send({ month: '2026-10', today: TODAY, items: [] }).expect(409);
  });

  test.each([
    ['misses a manual asset', () => []],
    [
      'repeats one',
      (id: string) => [
        { assetId: id, flowCents: 0, currentCents: 1 },
        { assetId: id, flowCents: 0, currentCents: 1 },
      ],
    ],
    ['names an unknown asset', () => [{ assetId: 'nope', flowCents: 0, currentCents: 1 }]],
  ])('refuses items that %s', async (_, itemsOf) => {
    const { agent, assetId } = await withManualAsset();
    await agent
      .post('/api/wealth/closings')
      .send(closing(assetId, { items: itemsOf(assetId) }))
      .expect(409);
  });

  test('names the asset with a negative value', async () => {
    const { agent, assetId } = await withManualAsset();
    const items = [{ assetId, flowCents: 0, currentCents: -1 }];
    const { body } = await agent.post('/api/wealth/closings').send(closing(assetId, { items })).expect(400);
    expect(body.error.message).toBe('Revise os valores de “Tesouro 27” (XP).');
  });

  test.each([
    { month: 'abc' },
    { today: 'abc' },
    { items: [{ assetId: 'a', flowCents: 1.5, currentCents: 1 }] },
  ])('rejects the malformed body %j', async (overrides) => {
    const { agent, assetId } = await withManualAsset();
    const { body } = await agent.post('/api/wealth/closings').send(closing(assetId, overrides)).expect(400);
    expect(body.error.code).toBe('validation_error');
  });

  test('leaves nothing behind when the closing fails partway', async () => {
    const { agent, container, assetId } = await withManualAsset();
    container.snapshots.insert({ month: '2026-10', totalCents: 1, contributionsCents: 0 });
    const changed = { ...manualAssetEntity(assetId), currentCents: 999 };

    expect(() =>
      container.snapshots.registerClosing({ month: '2026-10', totalCents: 2, contributionsCents: 0 }, [
        changed,
      ]),
    ).toThrow();

    const { body: wealth } = await agent.get(`/api/wealth?today=${TODAY}`).expect(200);
    expect(wealth.assets[0].currentCents).toBe(161_511);
  });

  test('rolls back the closing when an asset cannot be saved', async () => {
    const { container, assetId } = await withManualAsset();
    // The table's CHECK refuses a manual asset with no current value.
    const broken = { ...manualAssetEntity(assetId), currentCents: null as unknown as number };

    expect(() =>
      container.snapshots.registerClosing({ month: '2026-10', totalCents: 2, contributionsCents: 0 }, [
        broken,
      ]),
    ).toThrow();

    expect(container.snapshots.list()).toEqual([]);
  });
});

const manualAssetEntity = (id: string) => ({
  id,
  institution: 'XP',
  name: 'Tesouro 27',
  assetClass: 'tesouro' as const,
  pricing: 'manual' as const,
  investedCents: 98_080,
  currentCents: 161_511,
  updatedAt: TODAY,
});
