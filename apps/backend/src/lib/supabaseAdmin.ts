/**
 * Supabase Admin Client — SERVER SIDE ONLY
 *
 * Uses the SERVICE_ROLE key which bypasses Row Level Security (RLS).
 * Never import this file in frontend code.
 *
 * Usage:
 *   import { supabaseAdmin } from '../lib/supabaseAdmin';
 *   const { data, error } = await supabaseAdmin.from('products').select('*');
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.\n' +
    'Copy apps/backend/.env.example to apps/backend/.env and fill in the values.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Server-side: auto-refresh and session persistence are not needed
    autoRefreshToken: false,
    persistSession: false,
  },
});
