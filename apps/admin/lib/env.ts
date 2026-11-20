export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** False in offline mode: no project configured, only the test bench (starter rules) works. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
