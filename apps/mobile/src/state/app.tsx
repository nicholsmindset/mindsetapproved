import type { Rules, RulesBundle, UserSettings } from '@mindset/rules-engine';
import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { lookupProduct, type ProductHit } from '@/core/product-lookup';
import { resolveOnSignIn, toRow, type SettingsRow } from '@/core/settings-sync';
import { checkForUpdate, initialRules, type LatestVersion } from '@/core/rules-sync';
import { recheckEdited, runScan, type ScanEffects, type ScanInput, type ScanOutcome } from '@/core/scan-pipeline';
import { createStore, type Store } from '@/core/store';
import starter from '@/data/starter-bundle.json';
import { downloadBundle } from '@/platform/gunzip';
import { deviceKV } from '@/platform/kv';
import { supabase } from '@/platform/supabase';

interface AppCtx {
  store: Store;
  rules: Rules;
  settings: UserSettings;
  setSettings(s: UserSettings): void;
  online: boolean;
  onboarded: boolean;
  completeOnboarding(): void;
  /** Bumps when history changes, so lists re-read the store. */
  historyVersion: number;
  touchHistory(): void;
  scan(input: ScanInput): ScanOutcome;
  recheck(entryId: string, text: string): ScanOutcome | null;
  lookup(barcode: string): Promise<ProductHit | null>;
  syncRules(): Promise<void>;
  report(entryId: string, reason: string, comment?: string): Promise<{ ok: boolean; error?: string }>;
  deleteMyData(): Promise<{ ok: boolean; error?: string }>;
  /** Signed-in email, or null. Accounts are optional: they only sync rules and history across devices. */
  account: string | null;
  sendCode(email: string): Promise<{ ok: boolean; error?: string }>;
  verifyCode(email: string, code: string): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
  /** Server share code for a scan (creates it once). */
  shareCode(entryId: string): Promise<{ code?: string; error?: string }>;
}

const Ctx = createContext<AppCtx | null>(null);

const store = createStore(deviceKV, randomUUID);

const effects: ScanEffects | null = supabase
  ? {
      insertScan: async (row) => {
        const { data } = await supabase!.auth.getSession();
        const { error } = await supabase!.from('scans').insert({ ...row, user_id: data.session?.user.id ?? null });
        if (error) throw error;
      },
      logUnmatched: async (terms, example) => {
        const { error } = await supabase!.rpc('log_unmatched', { terms, example });
        if (error) throw error;
      },
      submitProduct: async (barcode, text, name, brand) => {
        const { error } = await supabase!.rpc('submit_product', { p_barcode: barcode, p_ingredients_raw: text, p_name: name ?? null, p_brand: brand ?? null });
        if (error) throw error;
      },
    }
  : null;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<Rules>(() => initialRules(store, starter as RulesBundle));
  const [settings, setSettingsState] = useState<UserSettings>(() => store.getSettings());
  const [online, setOnline] = useState(true);
  const [onboarded, setOnboarded] = useState(() => store.isOnboarded());
  const [historyVersion, setHistoryVersion] = useState(0);
  const [account, setAccount] = useState<string | null>(null);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id ?? null;
      setAccount(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userId.current = session?.user.id ?? null;
      setAccount(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const syncRules = useCallback(async () => {
    if (!supabase) return;
    const result = await checkForUpdate(rulesRef.current, {
      store,
      fetchLatest: async () => {
        const { data, error } = await supabase!.rpc('latest_rule_version');
        if (error) throw new Error(error.message);
        return ((data as LatestVersion[] | null) ?? [])[0] ?? null;
      },
      download: downloadBundle,
    });
    setOnline(result.status !== 'offline');
    if (result.status === 'updated') setRules(result.rules);
  }, []);

  // PRD: check for newer rules on each app open, in the background.
  useEffect(() => {
    void syncRules();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncRules();
    });
    return () => sub.remove();
  }, [syncRules]);

  const value = useMemo<AppCtx>(
    () => ({
      store,
      rules,
      settings,
      online,
      onboarded,
      completeOnboarding() {
        store.setOnboarded();
        setOnboarded(true);
      },
      historyVersion,
      setSettings(s) {
        store.setSettings(s);
        setSettingsState(s);
        // Query builders are lazy: they only send when awaited/then'd.
        if (supabase && userId.current) {
          supabase
            .from('user_settings')
            .upsert(toRow(userId.current, s))
            .then(({ error }) => error && console.warn('settings sync failed', error.message));
        }
      },
      account,
      async sendCode(email) {
        if (!supabase) return { ok: false, error: 'Sign-in needs an internet connection.' };
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      async verifyCode(email, code) {
        if (!supabase) return { ok: false, error: 'Sign-in needs an internet connection.' };
        const { data, error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
        if (error || !data.user) return { ok: false, error: error?.message ?? 'That code didn’t work.' };
        userId.current = data.user.id;
        // This phone's anonymous scans now belong to the account.
        await supabase.rpc('claim_install', { p_install_id: store.installId() });
        const { data: row } = await supabase.from('user_settings').select('*').eq('user_id', data.user.id).maybeSingle();
        const resolved = resolveOnSignIn(store.getSettings(), (row as SettingsRow | null) ?? null);
        store.setSettings(resolved.settings);
        setSettingsState(resolved.settings);
        if (resolved.upload) await supabase.from('user_settings').upsert(toRow(data.user.id, resolved.settings));
        return { ok: true };
      },
      async signOut() {
        await supabase?.auth.signOut();
        userId.current = null;
      },
      async shareCode(entryId) {
        const entry = store.getEntry(entryId);
        if (!supabase || !entry?.remoteScanId) return { error: 'Sharing needs an internet connection.' };
        if (entry.shareCode) return { code: entry.shareCode };
        const { data, error } = await supabase.rpc('share_verdict', { p_scan_id: entry.remoteScanId, p_install_id: store.installId() });
        if (error || !data) return { error: error?.message ?? 'Could not create a link.' };
        store.updateEntry(entryId, { shareCode: data as string });
        return { code: data as string };
      },
      touchHistory: () => setHistoryVersion((v) => v + 1),
      scan(input) {
        const out = runScan(input, { rules, settings, store, effects });
        setHistoryVersion((v) => v + 1);
        return out;
      },
      recheck(entryId, text) {
        const out = recheckEdited(entryId, text, { rules, settings, store, effects });
        setHistoryVersion((v) => v + 1);
        return out;
      },
      lookup: (barcode) =>
        lookupProduct(barcode, {
          store,
          fetch,
          fetchServerProduct: async (code) => {
            if (!supabase) return null;
            const { data, error } = await supabase.from('products').select('name, brand, ingredients_raw').eq('barcode', code).maybeSingle();
            if (error) throw new Error(error.message);
            return data;
          },
        }),
      syncRules,
      async report(entryId, reason, comment) {
        const entry = store.getEntry(entryId);
        if (!entry?.remoteScanId || !supabase) return { ok: false, error: 'Reports need an internet connection.' };
        const { error } = await supabase.from('reports').insert({ scan_id: entry.remoteScanId, reason, comment: comment || null });
        if (error) return { ok: false, error: error.message };
        store.updateEntry(entryId, { reported: true });
        setHistoryVersion((v) => v + 1);
        return { ok: true };
      },
      async deleteMyData() {
        if (supabase) {
          const { error } = await supabase.rpc('delete_install_data', { p_install_id: store.installId() });
          if (error) return { ok: false, error: error.message };
          if (userId.current) {
            const { error: e2 } = await supabase.rpc('delete_my_data');
            if (e2) return { ok: false, error: e2.message };
            await supabase.auth.signOut();
            userId.current = null;
          }
        }
        store.wipe();
        setSettingsState(store.getSettings());
        setOnboarded(false);
        setHistoryVersion((v) => v + 1);
        return { ok: true };
      },
    }),
    [rules, settings, online, onboarded, historyVersion, account, syncRules],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

/** Label photos stay in memory only (for "Re-check with AI"); they are never saved to history. */
export const photoByEntry = new Map<string, string>();
