import type { AutoAsset } from '@livro-caixa/domain';
import type { AssetRepository, Clock, QuoteProvider } from '../ports';

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
    if (!this.provider) return Promise.resolve();
    this.inFlight ??= this.refreshDue(this.provider).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refreshDue(provider: QuoteProvider): Promise<void> {
    const due = this.assets.listQuotesDue(this.clock.now() - QUOTE_MAX_AGE_MS);
    if (due.length === 0) return;
    const signal = AbortSignal.timeout(QUOTE_TIMEOUT_MS);
    await Promise.all(due.map((asset) => this.refreshOne(provider, asset, signal)));
  }

  private async refreshOne(provider: QuoteProvider, asset: AutoAsset, signal: AbortSignal): Promise<void> {
    const quote = await provider.quote(asset.name, signal).catch((error: unknown) => {
      console.warn(`Could not refresh the quote of ${asset.name}:`, error);
      return null;
    });
    this.assets.recordQuote(asset, quote, this.clock.now());
  }
}
