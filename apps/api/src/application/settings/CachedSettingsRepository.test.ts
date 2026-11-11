import { describe, expect, test } from 'bun:test';
import type { Settings } from '@livro-caixa/domain';
import type { SettingsRepository } from '../ports';
import { CachedSettingsRepository } from './CachedSettingsRepository';
import { createTranslateProvider } from './translate-provider';

const STORED: Settings = { partnerName: 'Bia', partnerShare: 50, language: 'pt-BR', currency: 'BRL' };

class CountingRepository implements SettingsRepository {
  reads = 0;
  constructor(public stored: Settings) {}
  get(): Settings {
    this.reads += 1;
    return this.stored;
  }
  save(settings: Settings): void {
    this.stored = settings;
  }
}

describe('CachedSettingsRepository', () => {
  test('reads the stored settings once', () => {
    const inner = new CountingRepository(STORED);
    const cached = new CachedSettingsRepository(inner);
    cached.get();
    cached.get();
    expect(inner.reads).toBe(1);
  });

  test('shows what was saved at once and stores it', () => {
    const inner = new CountingRepository(STORED);
    const cached = new CachedSettingsRepository(inner);
    cached.get();
    cached.save({ ...STORED, language: 'en' });
    expect(cached.get().language).toBe('en');
    expect(inner.stored.language).toBe('en');
    expect(inner.reads).toBe(1);
  });

  test('keeps asking while a read fails', () => {
    let fail = true;
    const inner = new CountingRepository(STORED);
    inner.get = () => {
      if (fail) throw new Error('locked');
      return STORED;
    };
    const cached = new CachedSettingsRepository(inner);
    expect(() => cached.get()).toThrow();
    fail = false;
    expect(cached.get()).toEqual(STORED);
  });
});

describe('createTranslateProvider', () => {
  test('translates in the stored language', () => {
    const settings = new CountingRepository({ ...STORED, language: 'en' });
    expect(createTranslateProvider(settings)()('api.routeNotFound')).toBe('Route not found.');
  });

  test('falls back to pt-BR when the settings cannot be read', () => {
    const settings = new CountingRepository(STORED);
    settings.get = () => {
      throw new Error('locked');
    };
    expect(createTranslateProvider(settings)()('api.routeNotFound')).toBe('Rota não encontrada.');
  });
});
