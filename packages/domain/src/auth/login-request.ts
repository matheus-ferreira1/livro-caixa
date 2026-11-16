import { z } from 'zod';
import { isEmailAddress, MAX_PASSWORD_LENGTH } from './credentials';

// Kept apart from credentials.ts so the login page, which only validates the form, does not pull zod in.
export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().refine(isEmailAddress),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  remember: z.boolean().default(true),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
