import { describe, expect, test } from 'vitest';
import { categoryCountLabel, shareExampleText, shareLabel, usageLabel } from './view-model';

describe('settings view model', () => {
  test('labels category usage', () => {
    expect(usageLabel(0)).toBe('Sem lançamentos');
    expect(usageLabel(1)).toBe('1 lançamento');
    expect(usageLabel(14)).toBe('14 lançamentos');
  });

  test('counts categories', () => {
    expect(categoryCountLabel(1)).toBe('1 categoria');
    expect(categoryCountLabel(3)).toBe('3 categorias');
  });

  test('shortens long partner names in the share label', () => {
    expect(shareLabel('Maria Eduarda Alves', 40)).toBe('Maria Eduard 40%');
  });

  test('explains the split with a R$ 100,00 bill', () => {
    expect(shareExampleText('Bia', 40)).toBe(
      'Exemplo: numa conta dividida de R$ 100,00, Bia paga R$ 40,00 e você paga R$ 60,00.',
    );
  });
});
