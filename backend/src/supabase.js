import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

export function getSupabase() {
  if (client) return client;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[Supabase] Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.'
    );
    return null;
  }

  client = createClient(supabaseUrl, supabaseKey);
  return client;
}

export function setSupabase(mockClient) {
  client = mockClient;
}
