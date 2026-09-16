import { createClient } from '@supabase/supabase-js';
import { environment } from './env';

export const supabase = createClient(environment.VITE_SUPABASE_URL, environment.VITE_SUPABASE_PUBLISHABLE_KEY);