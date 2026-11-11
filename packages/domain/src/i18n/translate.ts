import type { Language } from '../settings/preferences';
import { en } from './messages/en';
import { ptBR, type Messages } from './messages/pt-BR';

export type MessageKey = keyof Messages;

type MessageParams<K extends MessageKey> = Messages[K] extends (...args: infer P) => string ? P : [];

/** Looks a message up by key; entries that need values are functions, so the compiler checks them. */
export type Translate = <K extends MessageKey>(key: K, ...params: MessageParams<K>) => string;

const CATALOGS: Record<Language, Messages> = { 'pt-BR': ptBR, en };

export function translator(language: Language): Translate {
  const catalog = CATALOGS[language];
  return (key, ...params) => {
    const entry = catalog[key];
    // The type of `params` already matches the entry; the compiler cannot follow that through a union.
    return typeof entry === 'function'
      ? (entry as (...args: readonly unknown[]) => string)(...params)
      : entry;
  };
}
