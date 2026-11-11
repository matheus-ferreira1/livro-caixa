import { describe, expect, test } from 'bun:test';
import { formatQuantity, parseQuantity, toQuantityInput } from './quantity';

describe('parseQuantity', () => {
  test.each([
    ['3', 300_000_000],
    ['0,0038961', 389_610],
    ['0.0038961', 389_610],
    ['1,28952', 128_952_000],
    ['1.234,5', 123_450_000_000],
    ['4.89', 489_000_000],
    [' 2 ', 200_000_000],
    ['0,00000001', 1],
  ])('reads %s', (input, expected) => {
    expect(parseQuantity(input, 'BRL')).toBe(expected);
  });

  test.each(['', 'abc', '-1', '1,2,3', '0,000000001', '1.5,2'])('rejects %p', (input) => {
    expect(parseQuantity(input, 'BRL')).toBeNull();
  });
});

describe('formatQuantity', () => {
  test('shows up to 8 decimals in pt-BR', () => {
    expect(formatQuantity(389_610, 'BRL')).toBe('0,0038961');
    expect(formatQuantity(123_450_000_000, 'BRL')).toBe('1.234,5');
  });
});

describe('toQuantityInput', () => {
  test('gives a value that parses back to the same quantity', () => {
    expect(toQuantityInput(389_610, 'BRL')).toBe('0,0038961');
    expect(parseQuantity(toQuantityInput(389_610, 'BRL'), 'BRL')).toBe(389_610);
    expect(parseQuantity(toQuantityInput(300_000_000, 'BRL'), 'BRL')).toBe(300_000_000);
  });
});

describe('quantities of a dot-decimal currency', () => {
  test.each([
    ['3', 300_000_000],
    ['0.0038961', 389_610],
    ['0,0038961', 389_610],
    ['1,234.5', 123_450_000_000],
    ['1.28952', 128_952_000],
  ])('reads %s', (input, expected) => {
    expect(parseQuantity(input, 'USD')).toBe(expected);
  });

  test.each(['1.234,5', '1.5.2', ''])('rejects %p', (input) => {
    expect(parseQuantity(input, 'USD')).toBeNull();
  });

  test('shows and fills fields with a dot', () => {
    expect(formatQuantity(123_450_000_000, 'USD')).toBe('1,234.5');
    expect(toQuantityInput(389_610, 'GBP')).toBe('0.0038961');
    expect(parseQuantity(toQuantityInput(389_610, 'GBP'), 'GBP')).toBe(389_610);
  });
});
