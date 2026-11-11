import { DEFAULT_LANGUAGE, translator } from '@livro-caixa/domain';
import type { SettingsRepository, TranslateProvider } from '../ports';

/**
 * The translator of the instance language. A message must never be lost to a failing settings
 * read, which may be the very error being reported, so it falls back to the default language.
 */
export function createTranslateProvider(settings: SettingsRepository): TranslateProvider {
  return () => {
    try {
      return translator(settings.get().language);
    } catch {
      return translator(DEFAULT_LANGUAGE);
    }
  };
}
