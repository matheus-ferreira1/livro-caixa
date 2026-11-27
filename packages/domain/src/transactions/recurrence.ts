import { z } from 'zod';
import { isWeekday, type Weekday } from '../dates/dates';

export const RECURRENCE_FREQUENCIES = ['monthly', 'weekly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/** How a recurring series repeats. Non-recurring entries and acertos are stored as monthly. */
export type Recurrence = { frequency: 'monthly' } | { frequency: 'weekly'; weekdays: Weekday[] };

export const MONTHLY_RECURRENCE: Recurrence = Object.freeze({ frequency: 'monthly' });

export const sortWeekdays = (weekdays: readonly Weekday[]): Weekday[] => [...weekdays].sort((a, b) => a - b);

export const weeklyRecurrence = (weekdays: readonly Weekday[]): Recurrence => ({
  frequency: 'weekly',
  weekdays: sortWeekdays(weekdays),
});

const weekdaySchema = z.number().refine(isWeekday);

/**
 * Strict objects, so weekdays sent on a monthly recurrence are refused instead of dropped. An empty
 * weekly list passes here so validation can ask for a weekday with its own message.
 */
export const recurrenceSchema = z.discriminatedUnion('frequency', [
  z.strictObject({ frequency: z.literal('monthly') }),
  z.strictObject({
    frequency: z.literal('weekly'),
    weekdays: z
      .array(weekdaySchema)
      .refine((weekdays) => new Set(weekdays).size === weekdays.length)
      .transform(sortWeekdays),
  }),
]);
