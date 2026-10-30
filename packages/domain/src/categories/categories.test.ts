import { describe, expect, test } from 'bun:test';
import { aTransaction } from '../test/builders';
import {
  CATEGORY_MESSAGES,
  CATEGORY_PALETTE,
  categoriesOfType,
  categoryInputSchema,
  categoryPatchSchema,
  categoryUsageCounts,
  validateCategoryName,
} from './categories';

const categories = [
  { id: 'c-salario', name: 'Salário', type: 'receita' as const, color: '#2A78D6' },
  { id: 'c-mercado', name: 'Mercado', type: 'despesa' as const, color: '#1BAF7A' },
  { id: 'c-agua', name: 'Água', type: 'despesa' as const, color: '#008300' },
];

describe('validateCategoryName', () => {
  test('requires a name', () => {
    expect(validateCategoryName('   ', 'despesa', categories)).toBe(CATEGORY_MESSAGES.nameRequired);
  });

  test('rejects a case-insensitive duplicate within the type', () => {
    expect(validateCategoryName(' mercado ', 'despesa', categories)).toBe(CATEGORY_MESSAGES.duplicate);
  });

  test('allows the same name in the other type', () => {
    expect(validateCategoryName('Mercado', 'receita', categories)).toBeNull();
  });

  test('ignores the category being renamed', () => {
    expect(validateCategoryName('MERCADO', 'despesa', categories, 'c-mercado')).toBeNull();
  });
});

describe('categoryInputSchema', () => {
  test('accepts a palette color', () => {
    const input = { name: 'Pets', type: 'despesa' as const, color: CATEGORY_PALETTE[4] };
    expect(categoryInputSchema.parse(input)).toEqual(input);
  });

  test('rejects acerto and colors outside the palette', () => {
    expect(categoryInputSchema.safeParse({ name: 'X', type: 'acerto', color: '#2A78D6' }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ name: 'X', type: 'despesa', color: '#000000' }).success).toBe(false);
  });
});

describe('categoryPatchSchema', () => {
  test('does not allow changing the type', () => {
    expect(categoryPatchSchema.safeParse({ name: 'X', color: '#2A78D6', type: 'receita' }).success).toBe(false);
  });
});

describe('categoryUsageCounts', () => {
  test('counts entries per category and skips acertos', () => {
    const usage = categoryUsageCounts([
      aTransaction({ categoryId: 'c-mercado' }),
      aTransaction({ categoryId: 'c-mercado' }),
      aTransaction({ categoryId: 'c-salario', type: 'receita' }),
      aTransaction({ categoryId: null, type: 'acerto' }),
    ]);
    expect(usage).toEqual({ 'c-mercado': 2, 'c-salario': 1 });
  });
});

describe('categoriesOfType', () => {
  test('keeps one type sorted by name in pt-BR order', () => {
    expect(categoriesOfType(categories, 'despesa').map((c) => c.name)).toEqual(['Água', 'Mercado']);
  });
});
