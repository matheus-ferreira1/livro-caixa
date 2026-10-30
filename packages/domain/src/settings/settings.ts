import { z } from 'zod';
import { percentOf, type Cents } from '../money/money';

export const PARTNER_SHARE_STEP = 5;
const MAX_PARTNER_NAME_LENGTH = 60;
const EXAMPLE_BILL_CENTS: Cents = 10_000;

export const settingsInputSchema = z.object({
  partnerName: z.string().max(MAX_PARTNER_NAME_LENGTH).transform((name) => name.trim()),
  partnerShare: z
    .number()
    .int()
    .min(0)
    .max(100)
    .refine((share) => share % PARTNER_SHARE_STEP === 0),
});

/** The "numa conta dividida de R$ 100,00" preview on Configurações. */
export function splitExample(partnerShare: number) {
  const partnerCents = percentOf(EXAMPLE_BILL_CENTS, partnerShare);
  return { totalCents: EXAMPLE_BILL_CENTS, partnerCents, mineCents: EXAMPLE_BILL_CENTS - partnerCents };
}
