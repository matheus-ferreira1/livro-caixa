import { describe, expect, mock, spyOn, test } from 'bun:test';
import { BrapiQuoteProvider } from './BrapiQuoteProvider';

// The fields of a real response from GET /api/quote/PETR4, on 2026-11-03.
const QUOTE_RESPONSE = {
  results: [
    {
      symbol: 'PETR4',
      currency: 'BRL',
      regularMarketPrice: 52.71,
      regularMarketChange: 0.51,
      regularMarketChangePercent: 0.98,
      regularMarketPreviousClose: 52.2,
    },
  ],
  requestedAt: '2026-11-03T13:12:49.461Z',
  took: 0,
};

const respondWith = (body: unknown, status = 200) =>
  mock(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

const providerWith = (fetchQuote: ReturnType<typeof respondWith>) =>
  new BrapiQuoteProvider('secret-token', fetchQuote as unknown as typeof fetch);

describe('BrapiQuoteProvider', () => {
  test('converts the price to cents and the percent change to basis points', async () => {
    const quote = await providerWith(respondWith(QUOTE_RESPONSE)).quote('PETR4');
    expect(quote).toEqual({ priceCents: 5271, dayChangeBps: 98 });
  });

  test('rounds a float price to the nearest cent', async () => {
    const body = { results: [{ regularMarketPrice: 8.945001, regularMarketChangePercent: -0.0449 }] };
    expect(await providerWith(respondWith(body)).quote('MXRF11')).toEqual({
      priceCents: 895,
      dayChangeBps: -4,
    });
  });

  test('accepts a quote with no daily change', async () => {
    const body = { results: [{ regularMarketPrice: 10 }] };
    expect(await providerWith(respondWith(body)).quote('MXRF11')).toEqual({
      priceCents: 1000,
      dayChangeBps: null,
    });
  });

  test('sends the token as a Bearer header and the ticker encoded and upper-cased', async () => {
    const fetchQuote = respondWith(QUOTE_RESPONSE);
    const controller = new AbortController();

    await providerWith(fetchQuote).quote(' mxrf11/../x ', controller.signal);

    const [url, init] = fetchQuote.mock.calls[0] ?? [];
    expect(url).toBe('https://brapi.dev/api/quote/MXRF11%2F..%2FX');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret-token');
    expect(init?.signal).toBe(controller.signal);
  });

  test.each([401, 402, 404, 429, 500])('finds no quote on HTTP %i', async (status) => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    expect(await providerWith(respondWith({ error: true }, status)).quote('MXRF11')).toBeNull();
    warn.mockRestore();
  });

  test.each([
    {},
    { results: [] },
    { results: [{ regularMarketPrice: 'abc' }] },
    { results: [{ regularMarketPrice: 0 }] },
    { results: [{ regularMarketPrice: -1 }] },
    { results: [{ regularMarketPrice: 0.004 }] },
  ])('finds no quote in the unusable body %j', async (body) => {
    expect(await providerWith(respondWith(body)).quote('MXRF11')).toBeNull();
  });

  test('never logs the token', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    await providerWith(respondWith({ error: true }, 401)).quote('MXRF11');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
