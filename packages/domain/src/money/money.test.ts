import { describe, expect, test } from 'bun:test';
import type { Currency } from '../settings/preferences';
import { formatCompactAmount, moneyFormat } from './money';

const brl = moneyFormat('BRL');
const formatMoney = brl.format;
const formatSignedMoney = brl.formatSigned;
const formatPercent = brl.formatPercent;
const parseMoney = brl.parse;
const parseSignedMoney = brl.parseSigned;
const toMoneyInput = brl.toInput;

describe('formatCompactAmount', () => {
  test('abbreviates thousands with one decimal, without the currency', () => {
    expect(formatCompactAmount(123_456, 'pt-BR')).toBe('1,2 mil');
    expect(formatCompactAmount(45_000, 'pt-BR')).toBe('450');
  });

  test('uses the design minus sign for negatives', () => {
    expect(formatCompactAmount(-123_456, 'pt-BR')).toBe('−1,2 mil');
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

describe('parseSignedMoney', () => {
  test.each([
    ['50,00', 5000],
    ['+50,00', 5000],
    ['-50,00', -5000],
    ['−50,00', -5000],
    ['− R$ 1.234,56', -123_456],
    ['0,00', 0],
    ['-0,00', 0],
  ])('reads %s', (input, expected) => {
    expect(parseSignedMoney(input)).toBe(expected);
  });

  test.each(['', 'abc', '--5', '5-'])('rejects %p', (input) => {
    expect(parseSignedMoney(input)).toBeNull();
  });
});

describe('formatCompactAmount in English', () => {
  test('follows the language, not the currency', () => {
    expect(formatCompactAmount(123_456, 'en')).toBe('1.2K');
    expect(formatCompactAmount(-123_456, 'en')).toBe('−1.2K');
  });
});

// Intl separates the symbol with a no-break space in pt-BR and de-DE.
const NBSP = ' ';

describe.each<[Currency, string, string, string, string]>([
  ['BRL', 'R$', `R$${NBSP}1.234,56`, `−R$${NBSP}50,00`, '1234,56'],
  ['USD', '$', '$1,234.56', '−$50.00', '1234.56'],
  ['EUR', '€', `1.234,56${NBSP}€`, `−50,00${NBSP}€`, '1234,56'],
  ['GBP', '£', '£1,234.56', '−£50.00', '1234.56'],
])('moneyFormat(%s)', (currency, symbol, formatted, negative, input) => {
  const money = moneyFormat(currency);

  test('shows the symbol, the marks of its locale and the design minus', () => {
    expect(money.symbol).toBe(symbol);
    expect(money.format(123_456)).toBe(formatted);
    expect(money.format(-5_000)).toBe(negative);
  });

  test('puts the sign of a signed amount apart', () => {
    expect(money.formatSigned(5_000)).toBe(`+ ${money.format(5_000)}`);
    expect(money.formatSigned(-5_000)).toBe(`− ${money.format(5_000)}`);
  });

  test('renders cents for an editable field and reads them back', () => {
    expect(money.toInput(123_456)).toBe(input);
    expect(money.parse(money.toInput(123_456))).toBe(123_456);
  });

  test('reads the amount its own format shows', () => {
    expect(money.parse(formatted)).toBe(123_456);
    expect(money.parseSigned(negative)).toBe(-5_000);
  });
});

describe.each<[Currency, string, number | null]>([
  ['BRL', '1.234', 123_400],
  ['EUR', '1.234', 123_400],
  ['BRL', '1.234,5', 123_450],
  ['USD', '1,234', 123_400],
  ['GBP', '1,234', 123_400],
  ['USD', '1,234.5', 123_450],
  ['USD', '1,234,567.89', 123_456_789],
  ['USD', '$ 10.5', 1_050],
  ['USD', '10,5', 1_050],
  ['USD', '1.234', null],
  ['USD', '1.234,56', null],
  ['BRL', '1,234.56', null],
  ['EUR', '12,5€', 1_250],
  ['GBP', '£1,000', 100_000],
  ['USD', 'abc', null],
])('moneyFormat(%s).parse(%p)', (currency, text, cents) => {
  test(`gives ${cents}`, () => {
    expect(moneyFormat(currency).parse(text)).toBe(cents);
  });
});

describe('percentages', () => {
  test.each<[Currency, string]>([
    ['BRL', '12,5%'],
    ['USD', '12.5%'],
    ['GBP', '12.5%'],
  ])('follow the number format of %s', (currency, expected) => {
    expect(moneyFormat(currency).formatPercent(0.125)).toBe(expected);
  });

  test('keep the design minus in every format', () => {
    expect(moneyFormat('USD').formatPercent(-0.5)).toBe('−50%');
    expect(moneyFormat('EUR').formatPercent(-0.5)).toStartWith('−50');
  });
});
