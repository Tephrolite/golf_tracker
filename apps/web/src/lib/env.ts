import { z } from 'zod';

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
});
export const environment = environmentSchema.parse(import.meta.env);
