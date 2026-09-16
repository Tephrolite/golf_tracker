import { z } from 'zod';

export const ROUND_STATUSES = ['in_progress', 'completed', 'abandoned', 'deleted'] as const;
export const TRACKING_MODES = ['basic', 'detailed'] as const;
export const FAIRWAY_RESULTS = ['hit', 'left', 'right'] as const;

export const profileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  startingHandicap: z.number().min(-10).max(54).nullable(),
  createdAt: z.string().datetime(),
});

const normalizedEmail = z.string().trim().toLowerCase().email();
export const startingHandicapSchema = z.number().finite().min(-10).max(54).nullable().optional();
export const registrationSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required.').max(100),
  email: normalizedEmail,
  password: z.string().min(8, 'Password must meet the configured minimum length.'),
  passwordConfirmation: z.string(),
  startingHandicap: startingHandicapSchema,
}).refine((value) => value.password === value.passwordConfirmation, { path: ['passwordConfirmation'], message: 'Passwords do not match.' });
export const signInSchema = z.object({ email: normalizedEmail, password: z.string().min(1, 'Password is required.') });
export const profileBootstrapSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required.').max(100),
  startingHandicap: startingHandicapSchema,
});
export const profileBootstrapResponseSchema = z.object({ profile: profileSchema });

export const meResponseSchema = z.object({ profile: profileSchema.nullable() });

export const errorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type Profile = z.infer<typeof profileSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ProfileBootstrapInput = z.infer<typeof profileBootstrapSchema>;