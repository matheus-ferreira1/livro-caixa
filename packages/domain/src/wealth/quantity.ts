import { escapeForRegExp, groupMarkFor, numberMarks } from '../money/number-marks';
import { CURRENCIES, type Currency } from '../settings/preferences';

/** Quantities are integers scaled by this, so 0.0038961 ETH needs no float math. */
export const QUANTITY_SCALE = 100_000_000;

const QUANTITY_DECIMALS = 8;

/**
 * Whether a group mark before exactly three digits reads as thousands ("1,000" is 1000), as it
 * does in a money field. The real keeps its own rule, where "1.000" is 1: quantities with many
 * decimals are common among its users and thousands of units are not.
 */
const GROUPS_BEFORE_THREE_DIGITS: Record<Currency, boolean> = { BRL: false, USD: true, EUR: true, GBP: true };

interface QuantityFormat {
  parse(input: string): number | null;
  format(quantityE8: number): string;
  toInput(quantityE8: number): string;
}

function quantityFormat(currency: Currency): QuantityFormat {
  const { locale, decimal } = numberMarks(currency);
  const group = groupMarkFor(decimal);
  const groupPattern = escapeForRegExp(group);
  const decimalPattern = escapeForRegExp(decimal);
  const fraction = `\\d{1,${QUANTITY_DECIMALS}}`;
  const accepted = new RegExp(
    `^\\d+(?:${groupPattern}\\d{3})*${decimalPattern}${fraction}$|^\\d+(?:[.,]${fraction})?$`,
  );
  const grouped = new RegExp(`^[1-9]\\d{0,2}(?:${groupPattern}\\d{3})+(?:${decimalPattern}${fraction})?$`);
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: QUANTITY_DECIMALS });

  const normalize = (raw: string): string => {
    const usesBothMarks =
      raw.includes(decimal) || (GROUPS_BEFORE_THREE_DIGITS[currency] && grouped.test(raw));
    return usesBothMarks ? raw.replaceAll(group, '').replace(decimal, '.') : raw.replace(',', '.');
  };

  return {
    parse(input) {
      const raw = input.replace(/\s/g, '');
      const isGrouped = GROUPS_BEFORE_THREE_DIGITS[currency] && grouped.test(raw);
      if (!isGrouped && !accepted.test(raw)) return null;
      const [whole = '0', decimals = ''] = normalize(raw).split('.');
      return Number(whole) * QUANTITY_SCALE + Number(decimals.padEnd(QUANTITY_DECIMALS, '0'));
    },
    format: (quantityE8) => numberFormatter.format(quantityE8 / QUANTITY_SCALE),
    toInput(quantityE8) {
      const whole = Math.floor(quantityE8 / QUANTITY_SCALE);
      const decimals = String(quantityE8 % QUANTITY_SCALE)
        .padStart(QUANTITY_DECIMALS, '0')
        .replace(/0+$/, '');
      return decimals ? `${whole}${decimal}${decimals}` : String(whole);
    },
  };
}

const FORMATS = Object.fromEntries(
  CURRENCIES.map((currency) => [currency, quantityFormat(currency)]),
) as Record<Currency, QuantityFormat>;

/** Reads "3", "0,0038961", "1.234,5" or "4.89" (mirrored for dot-decimal currencies). */
export const parseQuantity = (input: string, currency: Currency): number | null =>
  FORMATS[currency].parse(input);

export const formatQuantity = (quantityE8: number, currency: Currency): string =>
  FORMATS[currency].format(quantityE8);

/** Value shown in an editable field: "0,0038961", with no thousands separator. */
export const toQuantityInput = (quantityE8: number, currency: Currency): string =>
  FORMATS[currency].toInput(quantityE8);
