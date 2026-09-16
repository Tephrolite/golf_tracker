import { z } from 'zod';

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  ALLOWED_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(values: Record<string, string | undefined> = process.env): Environment {
  return environmentSchema.parse(values);
}