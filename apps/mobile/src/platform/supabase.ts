import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Null when no project is configured: the app then runs fully offline on the shipped rules. */
export const supabase: SupabaseClient | null =
  URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

export const SUPABASE_URL = URL_;
export const SUPABASE_ANON_KEY = KEY;
