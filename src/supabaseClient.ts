/// <reference types="vite/client" />
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase.types';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isTest = import.meta.env.MODE === 'test';

const supabaseUrl =
  VITE_SUPABASE_URL ?? (isTest ? 'http://localhost:54321' : undefined);
const supabaseAnonKey =
  VITE_SUPABASE_ANON_KEY ?? (isTest ? 'test-anon-key' : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL oder Anon Key fehlt. Check .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
