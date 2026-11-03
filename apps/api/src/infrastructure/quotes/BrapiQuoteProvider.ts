import { z } from 'zod';
import type { Quote, QuoteProvider } from '../../application/ports';

const QUOTE_URL = 'https://brapi.dev/api/quote/';
const CENTS_PER_REAL = 100;
const BASIS_POINTS_PER_PERCENT = 100;
const HTTP_NOT_FOUND = 404;

const quoteResponse = z.object({
  results: z
    .array(
      z.object({
        regularMarketPrice: z.number().positive(),
        regularMarketChangePercent: z.number().nullish(),
      }),
    )
    .min(1),
});

/** Quotes from brapi.dev. The free plan answers one asset per request, for B3 stocks, ETFs and FIIs. */
export class BrapiQuoteProvider implements QuoteProvider {
  constructor(
    private readonly token: string,
    private readonly fetchQuote: typeof fetch = fetch,
  ) {}

  async quote(ticker: string, signal?: AbortSignal): Promise<Quote | null> {
    const symbol = encodeURIComponent(ticker.trim().toUpperCase());
    const response = await this.fetchQuote(`${QUOTE_URL}${symbol}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      signal,
    });
    if (!response.ok) {
      // An unknown ticker is the user's to fix; anything else means the token or the quota.
      if (response.status !== HTTP_NOT_FOUND) console.warn(`brapi answered ${response.status} for ${symbol}`);
      return null;
    }
    const parsed = quoteResponse.safeParse(await response.json());
    const result = parsed.success ? parsed.data.results[0] : undefined;
    if (!result) return null;
    const percent = result.regularMarketChangePercent;
    return {
      priceCents: Math.round(result.regularMarketPrice * CENTS_PER_REAL),
      dayChangeBps: percent == null ? null : Math.round(percent * BASIS_POINTS_PER_PERCENT),
    };
  }
}
