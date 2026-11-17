import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

export function getSupabase() {
  if (client) return client;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.');
    return null;
  }
  client = createClient(supabaseUrl, supabaseKey);
  return client;
}

export function setSupabase(mockClient) {
  client = mockClient;
}
