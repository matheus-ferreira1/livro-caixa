import { describe, expect, test } from 'bun:test';
import type { Quote, QuoteProvider } from '../../application/ports';
import { buildTestApp, signIn } from '../../test/harness';

const TODAY = '2026-11-03';
const THIRTY_MINUTES_MS = 30 * 60_000;

const anAsset = (overrides = {}) => ({
  institution: 'XP',
  name: 'MXRF11',
  assetClass: 'fii',
  pricing: 'auto',
  quantityE8: 300_000_000,
  avgPriceCents: null,
  priceCents: 894,
  investedCents: null,
  currentCents: null,
  today: TODAY,
  ...overrides,
});

class FakeQuotes implements QuoteProvider {
  readonly tickers: string[] = [];
  answer: (ticker: string, signal?: AbortSignal) => Promise<Quote | null> = async () => ({
    priceCents: 1000,
    dayChangeBps: 25,
  });

  quote(ticker: string, signal?: AbortSignal): Promise<Quote | null> {
    this.tickers.push(ticker);
    return this.answer(ticker, signal);
  }
}

async function setup(quotes: QuoteProvider | null = new FakeQuotes()) {
  const ctx = await buildTestApp({ quotes });
  await signIn(ctx.agent);
  const wealth = async () => (await ctx.agent.get(`/api/wealth?today=${TODAY}`).expect(200)).body;
  return { ...ctx, wealth };
}

describe('quotes on GET /api/wealth', () => {
  test('updates the price and daily change of an ETF or FII', async () => {
    const { agent, wealth } = await setup();
    await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .post('/api/assets')
      .send(anAsset({ name: 'LFTB11', assetClass: 'etf' }))
      .expect(201);

    const { assets, totalCents, dayChangeCents } = await wealth();

    expect(assets[0]).toMatchObject({ priceCents: 1000, dayChangeBps: 25 });
    expect(assets[1]).toMatchObject({ priceCents: 1000, dayChangeBps: 25 });
    expect(totalCents).toBe(6000);
    expect(dayChangeCents).toBe(14);
  });

  test('leaves the classes the free plan does not cover with their typed price', async () => {
    const quotes = new FakeQuotes();
    const { agent, wealth } = await setup(quotes);
    await agent
      .post('/api/assets')
      .send(anAsset({ name: 'ETH-BRL', assetClass: 'cripto' }))
      .expect(201);
    await agent
      .post('/api/assets')
      .send(anAsset({ name: 'Dólar', assetClass: 'cambio' }))
      .expect(201);

    const { assets } = await wealth();

    expect(quotes.tickers).toEqual([]);
    expect(assets[0]).toMatchObject({ priceCents: 894, dayChangeBps: null });
  });

  test('never asks about a manual asset', async () => {
    const quotes = new FakeQuotes();
    const { agent, wealth } = await setup(quotes);
    await agent
      .post('/api/assets')
      .send(anAsset({ pricing: 'manual', quantityE8: null, priceCents: null, currentCents: 100 }))
      .expect(201);
    await wealth();
    expect(quotes.tickers).toEqual([]);
  });

  test('sends nothing out without a provider, and typed prices still work', async () => {
    const { agent, wealth } = await setup(null);
    await agent.post('/api/assets').send(anAsset()).expect(201);
    const { assets } = await wealth();
    expect(assets[0]).toMatchObject({ priceCents: 894, dayChangeBps: null });
  });

  test('asks again only after 30 minutes', async () => {
    const quotes = new FakeQuotes();
    const { agent, clock, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);

    await wealth();
    await wealth();
    expect(quotes.tickers).toHaveLength(1);

    clock.advance(THIRTY_MINUTES_MS - 1);
    await wealth();
    expect(quotes.tickers).toHaveLength(1);

    clock.advance(1);
    await wealth();
    expect(quotes.tickers).toHaveLength(2);
  });

  test('keeps the stored price when no quote is found, and waits before asking again', async () => {
    const quotes = new FakeQuotes();
    quotes.answer = async () => null;
    const { agent, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);

    const first = await wealth();
    await wealth();

    expect(first.assets[0]).toMatchObject({ priceCents: 894, dayChangeBps: null });
    expect(quotes.tickers).toHaveLength(1);
  });

  test('keeps the read working when the provider fails', async () => {
    const quotes = new FakeQuotes();
    quotes.answer = async () => {
      throw new Error('network down');
    };
    const { agent, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);

    const { assets } = await wealth();

    expect(assets[0]).toMatchObject({ priceCents: 894 });
    await wealth();
    expect(quotes.tickers).toHaveLength(1);
  });

  test('gives up on a slow provider without failing the read', async () => {
    const quotes = new FakeQuotes();
    quotes.answer = (_, signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const { agent, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);

    const { assets } = await wealth();

    expect(assets[0]).toMatchObject({ priceCents: 894 });
  }, 6000);

  test('shares one refresh between requests that arrive together', async () => {
    const quotes = new FakeQuotes();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    quotes.answer = async () => {
      await gate;
      return { priceCents: 1000, dayChangeBps: null };
    };
    const { agent, container } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);

    const both = Promise.all([container.refreshQuotes.execute(), container.refreshQuotes.execute()]);
    release();
    await both;

    expect(quotes.tickers).toHaveLength(1);
  });

  test('asks again right after an edit, since the ticker may have changed', async () => {
    const quotes = new FakeQuotes();
    const { agent, wealth } = await setup(quotes);
    const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
    await wealth();

    await agent
      .put(`/api/assets/${body.asset.id}`)
      .send(anAsset({ name: 'HGLG11' }))
      .expect(200);
    await wealth();

    expect(quotes.tickers).toEqual(['MXRF11', 'HGLG11']);
  });

  test('keeps a quote from overwriting an asset switched to manual meanwhile', async () => {
    const { agent, container } = await setup();
    const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .put(`/api/assets/${body.asset.id}`)
      .send(anAsset({ pricing: 'manual', quantityE8: null, priceCents: null, currentCents: 100 }))
      .expect(200);

    container.assets.recordQuote(body.asset.id, { priceCents: 1, dayChangeBps: 1 }, 0);

    expect(container.assets.findById(body.asset.id)).toMatchObject({ pricing: 'manual', currentCents: 100 });
  });
});
