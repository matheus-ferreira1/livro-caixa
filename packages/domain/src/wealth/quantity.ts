/** Quantities are integers scaled by this, so 0.0038961 ETH needs no float math. */
export const QUANTITY_SCALE = 100_000_000;

const QUANTITY_DECIMALS = 8;
const QUANTITY_PATTERN = /^\d+(?:\.\d{3})*,\d{1,8}$|^\d+(?:[.,]\d{1,8})?$/;

const FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: QUANTITY_DECIMALS });

/**
 * Reads "3", "0,0038961", "1.234,5" or "4.89". Without a comma a dot is the decimal
 * separator, because quantities with many decimals are common and thousands are not.
 */
export function parseQuantity(input: string): number | null {
  const raw = input.replace(/\s/g, '');
  if (!QUANTITY_PATTERN.test(raw)) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return Number(whole) * QUANTITY_SCALE + Number(fraction.padEnd(QUANTITY_DECIMALS, '0'));
}

export const formatQuantity = (quantityE8: number): string => FORMATTER.format(quantityE8 / QUANTITY_SCALE);

/** Value shown in an editable field: "0,0038961", with no thousands separator. */
export function toQuantityInput(quantityE8: number): string {
  const whole = Math.floor(quantityE8 / QUANTITY_SCALE);
  const fraction = String(quantityE8 % QUANTITY_SCALE)
    .padStart(QUANTITY_DECIMALS, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole},${fraction}` : String(whole);
}
