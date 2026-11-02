import { z } from 'zod';
import { isMonthKey } from '../dates/dates';

// A household ledger has a few dozen recurring series at most.
const MAX_GENERATED_ITEMS = 500;

/** What "Gerar lançamentos" sends: the chosen series with the reviewed date and value. */
export const recurringGenerateSchema = z.object({
  month: z.string().refine(isMonthKey),
  items: z
    .array(z.object({ seriesId: z.string(), date: z.string(), valueCents: z.number().int() }))
    .max(MAX_GENERATED_ITEMS),
});

export type RecurringGenerateRequest = z.infer<typeof recurringGenerateSchema>;
