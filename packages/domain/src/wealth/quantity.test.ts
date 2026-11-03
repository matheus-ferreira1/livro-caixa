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
    expect(parseQuantity(input)).toBe(expected);
  });

  test.each(['', 'abc', '-1', '1,2,3', '0,000000001', '1.5,2'])('rejects %p', (input) => {
    expect(parseQuantity(input)).toBeNull();
  });
});

describe('formatQuantity', () => {
  test('shows up to 8 decimals in pt-BR', () => {
    expect(formatQuantity(389_610)).toBe('0,0038961');
    expect(formatQuantity(123_450_000_000)).toBe('1.234,5');
  });
});

describe('toQuantityInput', () => {
  test('gives a value that parses back to the same quantity', () => {
    expect(toQuantityInput(389_610)).toBe('0,0038961');
    expect(parseQuantity(toQuantityInput(389_610))).toBe(389_610);
    expect(parseQuantity(toQuantityInput(300_000_000))).toBe(300_000_000);
  });
});
