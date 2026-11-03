import { describe, expect, test } from 'bun:test';
import type { Quote, QuoteProvider } from '../../application/ports';
import { RefreshQuotes } from '../../application/wealth/RefreshQuotes';
import { buildTestApp, signIn } from '../../test/harness';

const TODAY = '2026-11-03';
const THIRTY_MINUTES_MS = 30 * 60_000;
const MARKET_TIME = 1_790_000_000_000;

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
    quotedAt: MARKET_TIME,
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

  test('asks about one asset at a time, as the free plan allows', async () => {
    const quotes = new FakeQuotes();
    let running = 0;
    let mostAtOnce = 0;
    quotes.answer = async () => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await Promise.resolve();
      running -= 1;
      return { priceCents: 1000, dayChangeBps: null, quotedAt: null };
    };
    const { agent, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .post('/api/assets')
      .send(anAsset({ name: 'HGLG11' }))
      .expect(201);

    await wealth();

    expect(quotes.tickers).toHaveLength(2);
    expect(mostAtOnce).toBe(1);
  });

  test('leaves the assets it had no time for to the next read, without marking them', async () => {
    const quotes = new FakeQuotes();
    const answer = quotes.answer;
    quotes.answer = (_, signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const { agent, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .post('/api/assets')
      .send(anAsset({ name: 'HGLG11' }))
      .expect(201);

    const first = await wealth();
    expect(quotes.tickers).toEqual(['MXRF11']);
    expect(first.assets[0]).toMatchObject({ name: 'MXRF11', quoteFailed: true });
    expect(first.assets[1]).toMatchObject({ name: 'HGLG11', quoteFailed: false });

    quotes.answer = answer;
    await wealth();
    expect(quotes.tickers).toEqual(['MXRF11', 'HGLG11']);
  }, 6000);

  test('shares one refresh between requests that arrive together', async () => {
    const quotes = new FakeQuotes();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    quotes.answer = async () => {
      await gate;
      return { priceCents: 1000, dayChangeBps: null, quotedAt: null };
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

  test('keeps a late quote from landing on an asset whose ticker changed', async () => {
    const { agent, container } = await setup();
    const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .put(`/api/assets/${body.asset.id}`)
      .send(anAsset({ name: 'HGLG11' }))
      .expect(200);

    container.assets.recordQuote(body.asset, { priceCents: 1, dayChangeBps: 1, quotedAt: null }, 0);

    expect(container.assets.findById(body.asset.id)).toMatchObject({ name: 'HGLG11', priceCents: 894 });
    expect(container.assets.listQuotesDue(0)).toHaveLength(1);
  });

  test('clears the daily change when no quote is found, since it would be an old one', async () => {
    const quotes = new FakeQuotes();
    const { agent, clock, wealth } = await setup(quotes);
    await agent.post('/api/assets').send(anAsset()).expect(201);
    await wealth();

    quotes.answer = async () => null;
    clock.advance(THIRTY_MINUTES_MS);
    const { assets } = await wealth();

    expect(assets[0]).toMatchObject({ priceCents: 1000, dayChangeBps: null });
  });

  test('keeps a quote from overwriting an asset switched to manual meanwhile', async () => {
    const { agent, container } = await setup();
    const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
    await agent
      .put(`/api/assets/${body.asset.id}`)
      .send(anAsset({ pricing: 'manual', quantityE8: null, priceCents: null, currentCents: 100 }))
      .expect(200);

    container.assets.recordQuote(body.asset, { priceCents: 1, dayChangeBps: 1, quotedAt: null }, 0);

    expect(container.assets.findById(body.asset.id)).toMatchObject({ pricing: 'manual', currentCents: 100 });
  });

  describe('quote status', () => {
    test('stores when the quote was current', async () => {
      const { agent, wealth } = await setup();
      await agent.post('/api/assets').send(anAsset()).expect(201);

      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: MARKET_TIME, quoteFailed: false });
    });

    test('falls back on the time of the check when the source gives no time', async () => {
      const quotes = new FakeQuotes();
      quotes.answer = async () => ({ priceCents: 1000, dayChangeBps: null, quotedAt: null });
      const { agent, clock, wealth } = await setup(quotes);
      await agent.post('/api/assets').send(anAsset()).expect(201);

      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: clock.now(), quoteFailed: false });
    });

    test('leaves a class that is never quoted with no quote', async () => {
      const { agent, wealth } = await setup();
      await agent
        .post('/api/assets')
        .send(anAsset({ name: 'ETH-BRL', assetClass: 'cripto' }))
        .expect(201);

      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: null, quoteFailed: false });
    });

    test('leaves every asset with no quote without a provider', async () => {
      const { agent, wealth } = await setup(null);
      await agent.post('/api/assets').send(anAsset()).expect(201);

      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: null, quoteFailed: false });
    });

    test('marks an earlier quote unavailable once there is no provider', async () => {
      const { agent, clock, container, wealth } = await setup();
      const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
      await wealth();

      await new RefreshQuotes(container.assets, null, clock).execute();

      expect(container.assets.findById(body.asset.id)).toMatchObject({
        priceCents: 1000,
        dayChangeBps: null,
        quotedAt: MARKET_TIME,
        quoteFailed: true,
      });
    });

    test('keeps the quote when an edit leaves the ticker, class and price alone', async () => {
      const quotes = new FakeQuotes();
      const { agent, wealth } = await setup(quotes);
      const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
      await wealth();

      quotes.answer = async () => null;
      await agent
        .put(`/api/assets/${body.asset.id}`)
        .send(anAsset({ institution: 'Clear', priceCents: 1000, today: '2026-11-04' }))
        .expect(200);
      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: MARKET_TIME, quoteFailed: true, updatedAt: TODAY });
    });

    test('marks a failed check and keeps the time of the last quote', async () => {
      const quotes = new FakeQuotes();
      const { agent, clock, wealth } = await setup(quotes);
      await agent.post('/api/assets').send(anAsset()).expect(201);
      await wealth();

      quotes.answer = async () => null;
      clock.advance(THIRTY_MINUTES_MS);
      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: MARKET_TIME, quoteFailed: true });
    });

    test('marks a provider error the same way', async () => {
      const quotes = new FakeQuotes();
      quotes.answer = async () => {
        throw new Error('network down');
      };
      const { agent, wealth } = await setup(quotes);
      await agent.post('/api/assets').send(anAsset()).expect(201);

      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: null, quoteFailed: true });
    });

    test('clears a failure once a quote is found again', async () => {
      const quotes = new FakeQuotes();
      const { agent, clock, wealth } = await setup(quotes);
      const answer = quotes.answer;
      quotes.answer = async () => null;
      await agent.post('/api/assets').send(anAsset()).expect(201);
      await wealth();

      quotes.answer = answer;
      clock.advance(THIRTY_MINUTES_MS);
      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: MARKET_TIME, quoteFailed: false });
    });

    test('forgets the quote when the asset is edited and no new one is found', async () => {
      const quotes = new FakeQuotes();
      const { agent, wealth } = await setup(quotes);
      const { body } = await agent.post('/api/assets').send(anAsset()).expect(201);
      await wealth();

      quotes.answer = async () => null;
      await agent
        .put(`/api/assets/${body.asset.id}`)
        .send(anAsset({ name: 'HGLG11' }))
        .expect(200);
      const { assets } = await wealth();

      expect(assets[0]).toMatchObject({ quotedAt: null, quoteFailed: true });
    });
  });
});
