import { z } from 'zod';
import { EMAIL_PATTERN } from './credentials';

// Kept apart from credentials.ts so the login page, which only validates the form, does not pull zod in.
export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_PATTERN),
  password: z.string().min(1),
  remember: z.boolean().default(true),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
