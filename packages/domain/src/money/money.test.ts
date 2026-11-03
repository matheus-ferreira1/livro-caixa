import { describe, expect, test } from 'bun:test';
import {
  formatCompactAmount,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  parseMoney,
  toMoneyInput,
} from './money';

describe('formatCompactAmount', () => {
  test('abbreviates thousands with one decimal, without the currency', () => {
    expect(formatCompactAmount(123_456)).toBe('1,2 mil');
    expect(formatCompactAmount(45_000)).toBe('450');
  });

  test('uses the design minus sign for negatives', () => {
    expect(formatCompactAmount(-123_456)).toBe('−1,2 mil');
  });
});

describe('parseMoney', () => {
  test.each([
    ['180', 18_000],
    ['180,00', 18_000],
    ['1.234,56', 123_456],
    ['1234,56', 123_456],
    ['R$ 10,5', 1_050],
    ['10.5', 1_050],
    ['10.50', 1_050],
    [' 0,01 ', 1],
  ])('parses %p as %p cents', (input, cents) => {
    expect(parseMoney(input)).toBe(cents);
  });

  test.each([
    ['1.234', 123_400],
    ['12.345', 1_234_500],
    ['10.012', 1_001_200],
    ['1.234.567', 123_456_700],
    ['R$ 1.234', 123_400],
  ])('reads the dots in %p as thousands separators, giving %p cents', (input, cents) => {
    expect(parseMoney(input)).toBe(cents);
  });

  test.each(['', '   ', 'abc', '1,2,3', 'R$', '1.2345', '1,234', '1..234', '.5', '10.5.123'])(
    'rejects %p',
    (input) => {
      expect(parseMoney(input)).toBeNull();
    },
  );

  test.each(['1234.567', '0.123', '012.345', '1234.567,89'])(
    'rejects %p, whose first group cannot be thousands',
    (input) => {
      expect(parseMoney(input)).toBeNull();
    },
  );
});

describe('formatMoney', () => {
  // Intl separates the symbol with a no-break space so amounts never wrap.
  test('formats cents as pt-BR currency', () => {
    expect(formatMoney(123_456)).toBe('R$\u00a01.234,56');
    expect(formatMoney(0)).toBe('R$\u00a00,00');
  });

  test('uses the typographic minus for negatives', () => {
    expect(formatMoney(-5_000)).toBe('−R$\u00a050,00');
  });

  test('signed format puts the sign apart', () => {
    expect(formatSignedMoney(5_000)).toBe('+ R$\u00a050,00');
    expect(formatSignedMoney(-5_000)).toBe('− R$\u00a050,00');
  });
});

describe('toMoneyInput', () => {
  test('renders cents for an editable field', () => {
    expect(toMoneyInput(18_000)).toBe('180,00');
    expect(toMoneyInput(123_456)).toBe('1234,56');
  });
});

describe('formatPercent', () => {
  test('uses the pt-BR comma and one fraction digit by default', () => {
    expect(formatPercent(0.125)).toBe('12,5%');
  });

  test('can round to whole percents', () => {
    expect(formatPercent(0.126, 0)).toBe('13%');
  });

  test('uses U+2212 for negatives', () => {
    expect(formatPercent(-0.5)).toBe('−50%');
  });
});
