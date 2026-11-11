import type { Settings } from '@livro-caixa/domain';
import type { SettingsRepository } from '../ports';

/**
 * The settings are read on almost every request (the language of each message), and only a save
 * changes them, so the first read is kept and a save replaces it.
 */
export class CachedSettingsRepository implements SettingsRepository {
  private cached: Settings | null = null;

  constructor(private readonly inner: SettingsRepository) {}

  get(): Settings {
    this.cached ??= this.inner.get();
    return this.cached;
  }

  save(settings: Settings): void {
    this.inner.save(settings);
    this.cached = settings;
  }
}
