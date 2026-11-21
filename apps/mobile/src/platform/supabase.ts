import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { deviceKV } from './kv';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Supabase auth keeps its session in the same device store (MMKV / localStorage). */
const authStorage = {
  getItem: async (k: string) => deviceKV.getString(`auth.${k}`) ?? null,
  setItem: async (k: string, v: string) => deviceKV.set(`auth.${k}`, v),
  removeItem: async (k: string) => deviceKV.remove(`auth.${k}`),
};

/** Null when no project is configured: the app then runs fully offline on the shipped rules. */
export const supabase: SupabaseClient | null =
  URL_ && KEY
    ? createClient(URL_, KEY, {
        auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

// React Native: only refresh tokens while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void supabase!.auth.startAutoRefresh();
    else void supabase!.auth.stopAutoRefresh();
  });
}

export const SUPABASE_URL = URL_;
export const SUPABASE_ANON_KEY = KEY;
/** Public site that hosts shared verdict pages (/v/<code>); sharing a link is hidden until it is set. */
export const SHARE_BASE_URL = (process.env.EXPO_PUBLIC_SHARE_BASE_URL ?? '').replace(/\/$/, '');
