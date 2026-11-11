import type { Language } from '@livro-caixa/domain';

/** The language the page was last set to, for code that runs outside React (the API client). */
export const documentLanguage = (): Language => (document.documentElement.lang === 'en' ? 'en' : 'pt-BR');
