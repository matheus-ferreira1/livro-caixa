import type { AutoAsset } from '@livro-caixa/domain';
import type { AssetRepository, Clock, Quote, QuoteProvider } from '../ports';

/** How often the free plan updates a quote, so asking sooner would only spend the monthly quota. */
const QUOTE_MAX_AGE_MS = 30 * 60_000;
/** The page waits for this, so a slow provider delays it a little and never breaks it. */
const QUOTE_TIMEOUT_MS = 3000;

/**
 * Refreshes quotes when someone opens Patrimônio, not on a timer: a timer would spend the
 * free quota around the clock. Failures keep the stored price, and they still count as a
 * check, so a ticker with no quote is not asked about on every page load.
 */
export class RefreshQuotes {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly assets: AssetRepository,
    private readonly provider: QuoteProvider | null,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<void> {
    if (!this.provider) {
      this.assets.markQuotesUnavailable();
      return Promise.resolve();
    }
    this.inFlight ??= this.refreshDue(this.provider).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refreshDue(provider: QuoteProvider): Promise<void> {
    const due = this.assets.listQuotesDue(this.clock.now() - QUOTE_MAX_AGE_MS);
    if (due.length === 0) return;
    const signal = AbortSignal.timeout(QUOTE_TIMEOUT_MS);
    // One at a time, as the free plan allows. Assets not reached in time stay due for the next read.
    for (const [index, asset] of due.entries()) {
      if (signal.aborted) return;
      await this.refreshOne(provider, asset, signal, index === 0);
    }
  }

  private async refreshOne(
    provider: QuoteProvider,
    asset: AutoAsset,
    signal: AbortSignal,
    hadAllTheTime: boolean,
  ): Promise<void> {
    let quote: Quote | null = null;
    try {
      quote = await provider.quote(asset.name, signal);
    } catch (error) {
      // Earlier lookups may have used up the time, which says nothing about this one, so it stays
      // due. A lookup that had all the time counts, or a hung provider would delay every read.
      if (signal.aborted && !hadAllTheTime) return;
      console.warn(`Could not refresh the quote of ${asset.name}:`, error);
    }
    this.assets.recordQuote(asset, quote, this.clock.now());
  }
}
