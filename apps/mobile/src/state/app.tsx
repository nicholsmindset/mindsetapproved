import type { Rules, RulesBundle, UserSettings } from '@mindset/rules-engine';
import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { lookupProduct, type ProductHit } from '@/core/product-lookup';
import { mergeRemote, REMOTE_SCAN_COLUMNS, type RemoteScan } from '@/core/history-sync';
import { resolveOnSignIn, toRow, type SettingsRow } from '@/core/settings-sync';
import { checkForUpdate, initialRules, type LatestVersion } from '@/core/rules-sync';
import { recheckEdited, runScan, type ScanEffects, type ScanInput, type ScanOutcome } from '@/core/scan-pipeline';
import { createOutbox, isPermanent, PermanentError, type Job } from '@/core/outbox';
import { createStore, type HistoryEntry, type Store } from '@/core/store';
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
  /** Scan history, newest first (re-read from the store after every change). */
  history: HistoryEntry[];
  /** Re-reads history after a direct store change. */
  touchHistory(): void;
  scan(input: ScanInput): ScanOutcome;
  recheck(entryId: string, text: string): ScanOutcome | null;
  lookup(barcode: string): Promise<ProductHit | null>;
  syncRules(): Promise<void>;
  report(entryId: string, reason: string, comment?: string): Promise<{ ok: boolean; queued?: boolean; error?: string }>;
  deleteMyData(): Promise<{ ok: boolean; error?: string }>;
  /** Signed-in email, or null. Accounts are optional: they only sync rules and history across devices. */
  account: string | null;
  sendCode(email: string): Promise<{ ok: boolean; error?: string }>;
  verifyCode(email: string, code: string): Promise<{ ok: boolean; error?: string }>;
  signOut(): Promise<void>;
  setFavourite(entryId: string, favourite: boolean): void;
  /** Pulls the account's scans from other devices into local history. */
  pullHistory(): Promise<number>;
  /** Server share code for a scan (creates it once). */
  shareCode(entryId: string): Promise<{ code?: string; error?: string }>;
}

const Ctx = createContext<AppCtx | null>(null);

const store = createStore(deviceKV, randomUUID);

/** Sends one queued job; server errors that retrying can't fix become PermanentError so the outbox drops them. */
async function sendJob(job: Job): Promise<void> {
  if (!supabase) throw new PermanentError('no server configured');
  const check = (error: { code?: string; message: string } | null) => {
    if (!error) return;
    throw isPermanent(error.code) ? new PermanentError(error.message) : new Error(error.message);
  };
  switch (job.kind) {
    case 'scan': {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      // Signed in: keep the ingredient text with the scan so history can follow the account to other devices.
      const ocr = (job.row.ocr_text as string | null) ?? (uid ? job.text.slice(0, 8000) : null);
      const { error } = await supabase.from('scans').insert({ ...job.row, user_id: uid, ocr_text: ocr });
      // A retried insert that already landed is fine.
      if (error?.code === '23505') return;
      return check(error);
    }
    case 'unmatched':
      return check((await supabase.rpc('log_unmatched', { terms: job.terms, example: job.example })).error);
    case 'product':
      // Shared with other users only once a second install submits the same text (or an admin accepts it).
      return check(
        (
          await supabase.rpc('submit_product', {
            p_barcode: job.barcode,
            p_ingredients_raw: job.text,
            p_install_id: store.installId(),
            p_name: job.name ?? null,
            p_brand: job.brand ?? null,
          })
        ).error,
      );
    case 'report': {
      const { error } = await supabase.from('reports').insert({ scan_id: job.scanId, reason: job.reason, comment: job.comment || null });
      if (error?.code === '23505') return; // already reported
      return check(error);
    }
    case 'scanUpdate': {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new PermanentError('signed out');
      return check(
        (
          await supabase.rpc('update_my_scan', {
            p_scan_id: job.scanId,
            p_favourite: job.favourite ?? null,
            p_ocr_text: job.text ?? null,
            p_verdict: job.verdict ?? null,
          })
        ).error,
      );
    }
  }
}

const outbox = createOutbox(deviceKV, randomUUID, sendJob);

const effects: ScanEffects | null = supabase
  ? {
      insertScan: (row, fullText) => outbox.enqueue({ kind: 'scan', row, text: fullText }),
      logUnmatched: (terms, example) => outbox.enqueue({ kind: 'unmatched', terms, example }),
      submitProduct: (barcode, text, name, brand) => outbox.enqueue({ kind: 'product', barcode, text, name, brand }),
    }
  : null;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<Rules>(() => initialRules(store, starter as RulesBundle));
  const [settings, setSettingsState] = useState<UserSettings>(() => store.getSettings());
  const [online, setOnline] = useState(true);
  const [onboarded, setOnboarded] = useState(() => store.isOnboarded());
  const [history, setHistory] = useState<HistoryEntry[]>(() => store.getHistory());
  const refreshHistory = useCallback(() => setHistory(store.getHistory()), []);
  const [account, setAccount] = useState<string | null>(null);
  const userId = useRef<string | null>(null);

  const pullHistory = useCallback(async () => {
    if (!supabase || !userId.current) return 0;
    const { data, error } = await supabase.from('scans').select(REMOTE_SCAN_COLUMNS).eq('user_id', userId.current).order('created_at', { ascending: false }).limit(500);
    if (error || !data) return 0;
    const { merged, added } = mergeRemote(store.getHistory(), data as RemoteScan[]);
    store.setHistory(merged);
    refreshHistory();
    return added;
  }, [refreshHistory]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id ?? null;
      setAccount(data.session?.user.email ?? null);
      if (userId.current) void pullHistory();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userId.current = session?.user.id ?? null;
      setAccount(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [pullHistory]);

  // Background sync reads the latest rules without re-creating the callback.
  const rulesRef = useRef(rules);
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

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
    void outbox.flush();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void syncRules();
        void outbox.flush(); // send anything queued while offline
      }
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
      history,
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
        await pullHistory();
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
        // The scan must be on the server before it can be shared.
        const { remaining } = await outbox.flush();
        if (remaining > 0) return { error: 'You’re offline. Try sharing again when you’re back online.' };
        const { data, error } = await supabase.rpc('share_verdict', { p_scan_id: entry.remoteScanId, p_install_id: store.installId() });
        if (error || !data) return { error: error?.message ?? 'Could not create a link.' };
        store.updateEntry(entryId, { shareCode: data as string });
        return { code: data as string };
      },
      touchHistory: refreshHistory,
      scan(input) {
        const out = runScan(input, { rules, settings, store, effects });
        refreshHistory();
        return out;
      },
      recheck(entryId, text) {
        const out = recheckEdited(entryId, text, { rules, settings, store, effects });
        refreshHistory();
        const remoteId = out?.entry.remoteScanId;
        if (out && remoteId && supabase && userId.current) {
          void outbox.enqueue({ kind: 'scanUpdate', scanId: remoteId, text, verdict: out.result.verdict });
        }
        return out;
      },
      setFavourite(entryId, favourite) {
        store.updateEntry(entryId, { favourite });
        refreshHistory();
        const remoteId = store.getEntry(entryId)?.remoteScanId;
        if (remoteId && supabase && userId.current) {
          void outbox.enqueue({ kind: 'scanUpdate', scanId: remoteId, favourite });
        }
      },
      pullHistory,
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
        if (!entry?.remoteScanId || !supabase) return { ok: false, error: 'Reports aren’t available for this scan.' };
        // Queued like every other server write: sent now if online, otherwise as soon as the app is back online.
        const sent = await outbox.enqueue({ kind: 'report', scanId: entry.remoteScanId, reason, comment });
        store.updateEntry(entryId, { reported: true });
        refreshHistory();
        return { ok: true, queued: !sent };
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
        outbox.clear();
        store.wipe();
        setSettingsState(store.getSettings());
        setOnboarded(false);
        refreshHistory();
        return { ok: true };
      },
    }),
    [rules, settings, online, onboarded, history, account, syncRules, pullHistory, refreshHistory],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

/** Label photos stay in memory only (for "Re-check with AI"); they are never saved to history. Last 20 kept. */
class PhotoMemory extends Map<string, string> {
  override set(key: string, value: string) {
    super.set(key, value);
    while (this.size > 20) this.delete(this.keys().next().value as string);
    return this;
  }
}
export const photoByEntry = new PhotoMemory();
