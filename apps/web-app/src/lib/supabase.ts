/**
 * Supabase Browser Client — CLIENT SIDE
 *
 * Uses the ANON key — safe to expose in the browser.
 * Row Level Security (RLS) policies on each table control what
 * authenticated / anonymous users can read or write.
 *
 * Usage:
 *   import { supabase } from '../lib/supabase';
 *   const { data, error } = await supabase.from('products').select('*');
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.\n' +
    'Copy apps/web-app/.env.example to apps/web-app/.env and fill in the values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
