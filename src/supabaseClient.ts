/// <reference types="vite/client" />
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase.types';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isTest = import.meta.env.MODE === 'test';
export const isSupabaseConfigured = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);

const supabaseUrl =
  VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseAnonKey =
  VITE_SUPABASE_ANON_KEY ?? (isTest ? 'test-anon-key' : 'missing-local-anon-key');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
