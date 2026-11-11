import { z } from 'zod';
import { percentOf, type Cents } from '../money/money';
import { CURRENCIES, LANGUAGES } from './preferences';

export const PARTNER_SHARE_STEP = 5;
const MAX_PARTNER_NAME_LENGTH = 60;
const EXAMPLE_BILL_CENTS: Cents = 10_000;

/** Each section of Configurações saves only its own fields, so every field is optional. */
export const settingsInputSchema = z.object({
  partnerName: z
    .string()
    .max(MAX_PARTNER_NAME_LENGTH)
    .transform((name) => name.trim())
    .optional(),
  partnerShare: z
    .number()
    .int()
    .min(0)
    .max(100)
    .refine((share) => share % PARTNER_SHARE_STEP === 0)
    .optional(),
  language: z.enum(LANGUAGES).optional(),
  currency: z.enum(CURRENCIES).optional(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

/** The "numa conta dividida de R$ 100,00" preview on Configurações. */
export function splitExample(partnerShare: number) {
  const partnerCents = percentOf(EXAMPLE_BILL_CENTS, partnerShare);
  return { totalCents: EXAMPLE_BILL_CENTS, partnerCents, mineCents: EXAMPLE_BILL_CENTS - partnerCents };
}
