import { DEFAULT_LANGUAGE, type Language } from '@livro-caixa/domain';

let currentLanguage: () => Language = () => DEFAULT_LANGUAGE;

/**
 * Tells code that runs outside React (the API client) where the instance language lives, which is
 * the preferences held by the query client. Set once, when the query client is created.
 */
export const setLanguageSource = (source: () => Language): void => {
  currentLanguage = source;
};

export const instanceLanguage = (): Language => currentLanguage();
