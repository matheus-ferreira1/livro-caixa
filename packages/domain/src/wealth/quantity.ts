import { numberMarks, groupMarkFor } from '../money/number-marks';
import type { Currency } from '../settings/preferences';

/** Quantities are integers scaled by this, so 0.0038961 ETH needs no float math. */
export const QUANTITY_SCALE = 100_000_000;

const QUANTITY_DECIMALS = 8;

/**
 * Reads "3", "0,0038961", "1.234,5" or "4.89" (mirrored for dot-decimal currencies). Without the
 * currency's decimal mark, the other mark is the decimal separator, because quantities with many
 * decimals are common and thousands are not.
 */
export function parseQuantity(input: string, currency: Currency): number | null {
  const { decimal } = numberMarks(currency);
  const group = groupMarkFor(decimal);
  const raw = input.replace(/\s/g, '');
  const escapedGroup = `\\${group}`;
  const escapedDecimal = `\\${decimal}`;
  const pattern = new RegExp(
    `^\\d+(?:${escapedGroup}\\d{3})*${escapedDecimal}\\d{1,${QUANTITY_DECIMALS}}$|^\\d+(?:[.,]\\d{1,${QUANTITY_DECIMALS}})?$`,
  );
  if (!pattern.test(raw)) return null;
  const normalized = raw.includes(decimal)
    ? raw.replaceAll(group, '').replace(decimal, '.')
    : raw.replace(',', '.');
  const [whole = '0', fraction = ''] = normalized.split('.');
  return Number(whole) * QUANTITY_SCALE + Number(fraction.padEnd(QUANTITY_DECIMALS, '0'));
}

export const formatQuantity = (quantityE8: number, currency: Currency): string =>
  new Intl.NumberFormat(numberMarks(currency).locale, { maximumFractionDigits: QUANTITY_DECIMALS }).format(
    quantityE8 / QUANTITY_SCALE,
  );

/** Value shown in an editable field: "0,0038961", with no thousands separator. */
export function toQuantityInput(quantityE8: number, currency: Currency): string {
  const whole = Math.floor(quantityE8 / QUANTITY_SCALE);
  const fraction = String(quantityE8 % QUANTITY_SCALE)
    .padStart(QUANTITY_DECIMALS, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}${numberMarks(currency).decimal}${fraction}` : String(whole);
}
