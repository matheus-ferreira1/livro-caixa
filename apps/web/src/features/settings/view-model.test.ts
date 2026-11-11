import { DEFAULT_LOCALIZATION, localization } from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { categoryCountLabel, shareExampleText, shareLabel, usageLabel } from './view-model';

describe('settings view model', () => {
  test('labels category usage', () => {
    expect(usageLabel(0, DEFAULT_LOCALIZATION)).toBe('Sem lançamentos');
    expect(usageLabel(1, DEFAULT_LOCALIZATION)).toBe('1 lançamento');
    expect(usageLabel(14, DEFAULT_LOCALIZATION)).toBe('14 lançamentos');
  });

  test('counts categories', () => {
    expect(categoryCountLabel(1, DEFAULT_LOCALIZATION)).toBe('1 categoria');
    expect(categoryCountLabel(3, DEFAULT_LOCALIZATION)).toBe('3 categorias');
  });

  test('shortens long partner names in the share label', () => {
    expect(shareLabel('Maria Eduarda Alves', 40)).toBe('Maria Eduard 40%');
  });

  test('explains the split with a R$ 100,00 bill', () => {
    expect(shareExampleText('Bia', 40, DEFAULT_LOCALIZATION)).toBe(
      'Exemplo: numa conta dividida de R$ 100,00, Bia paga R$ 40,00 e você paga R$ 60,00.',
    );
  });

  test('speaks English and writes amounts the way the currency does', () => {
    const english = localization('en', 'USD');
    expect(usageLabel(0, english)).toBe('No entries');
    expect(usageLabel(14, english)).toBe('14 entries');
    expect(categoryCountLabel(1, english)).toBe('1 category');
    expect(shareExampleText('Bia', 40, english)).toBe(
      'Example: on a split bill of $100.00, Bia pays $40.00 and you pay $60.00.',
    );
  });

  test('mixes Portuguese with a dot-decimal currency', () => {
    expect(shareExampleText('Bia', 40, localization('pt-BR', 'USD'))).toBe(
      'Exemplo: numa conta dividida de $100.00, Bia paga $40.00 e você paga $60.00.',
    );
  });
});
