import { describe, expect, test } from 'bun:test';
import { EN_SECTIONS, en } from './messages/en';
import { PT_BR_SECTIONS, ptBR } from './messages/pt-BR';
import { translator } from './translate';

describe('catalogs', () => {
  test('define the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort());
  });

  test('take the same values in both languages', () => {
    const arityOf = (catalog: Record<string, unknown>) =>
      Object.entries(catalog).map(([key, entry]) => [key, typeof entry === 'function' ? entry.length : 0]);
    expect(arityOf(en)).toEqual(arityOf(ptBR));
  });

  test('keep every section to its own keys, so no section hides another one', () => {
    const keys = Object.values(PT_BR_SECTIONS).flatMap((section) => Object.keys(section));
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(EN_SECTIONS)).toEqual(Object.keys(PT_BR_SECTIONS));
  });

  test('write no empty message', () => {
    const empty = Object.entries(en).filter(([, entry]) => entry === '');
    expect(empty).toEqual([]);
  });
});

describe('translator', () => {
  test('looks plain messages up in the chosen language', () => {
    expect(translator('pt-BR')('form.date')).toBe('Informe a data.');
    expect(translator('en')('form.date')).toBe('Enter the date.');
  });

  test('fills the values of messages that take them', () => {
    expect(translator('pt-BR')('elapsed.minutes', 5)).toBe('há 5 min');
    expect(translator('en')('elapsed.minutes', 5)).toBe('5 min ago');
    expect(translator('en')('closing.review', 'Tesouro', 'XP')).toBe('Review the values of “Tesouro” (XP).');
  });
});
