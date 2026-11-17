import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let client = null;

export function getSupabase() {
  if (client) return client;
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_KEY is missing.');
    return null;
  }
  client = createClient(supabaseUrl, supabaseKey);
  return client;
}

export function setSupabase(mockClient) {
  client = mockClient;
}
