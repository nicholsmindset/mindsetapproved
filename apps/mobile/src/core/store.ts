import { DEFAULT_SETTINGS, type RulesBundle, type UserSettings, type Verdict } from '@mindset/rules-engine';
import type { KV } from './kv';

export type ScanSource = 'cache' | 'off' | 'label' | 'ai';

export interface HistoryEntry {
  id: string;
  createdAt: string;
  source: ScanSource;
  barcode?: string;
  productName?: string;
  brand?: string;
  /** Ingredient text as scanned or as last edited by the user. */
  text: string;
  ocrConfidence: number;
  /** Verdict and summary when scanned (the result screen re-runs on current rules). */
  verdict: Verdict;
  summary: string;
  rulesVersion: number;
  favourite: boolean;
  /** scans.id on the server, for reports. */
  remoteScanId?: string;
  reported?: boolean;
  /** Code of the public share page (/v/<code>), once shared. */
  shareCode?: string;
}

export interface CachedProduct {
  barcode: string;
  name?: string;
  brand?: string;
  text: string;
  source: 'cache' | 'off';
  at: string;
}

const K = {
  onboarded: 'onboarded.v1',
  installId: 'install.id',
  settings: 'settings.v1',
  history: 'history.v1',
  products: 'products.v1',
  rules: 'rules.bundle',
  limits: 'limits.v1',
  premium: 'premium.v1',
  labelScript: 'label-script.v1',
} as const;

/** Which ML Kit model reads label photos. Each non-Latin model also reads Latin text. */
export type LabelScript = 'latin' | 'chinese' | 'japanese' | 'korean';
export const LABEL_SCRIPTS: { id: LabelScript; label: string }[] = [
  { id: 'latin', label: 'English / Malay' },
  { id: 'chinese', label: '中文' },
  { id: 'japanese', label: '日本語' },
  { id: 'korean', label: '한국어' },
];

export const HISTORY_CAP = 500;
export const PRODUCTS_CAP = 300;

function readJSON<T>(kv: KV, key: string, fallback: T): T {
  const raw = kv.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Typed wrapper over the device key-value store. Everything is local-first. */
export function createStore(kv: KV, newId: () => string) {
  return {
    kv,
    newId,

    isOnboarded: () => kv.getString(K.onboarded) === '1',
    setOnboarded: () => kv.set(K.onboarded, '1'),

    /** Random per-install id: links this phone's anonymous scans for delete-my-data and AI limits. */
    installId(): string {
      let id = kv.getString(K.installId);
      if (!id) {
        id = newId();
        kv.set(K.installId, id);
      }
      return id;
    },

    getSettings: (): UserSettings => ({ ...DEFAULT_SETTINGS, ...readJSON<Partial<UserSettings>>(kv, K.settings, {}) }),
    setSettings: (s: UserSettings) => kv.set(K.settings, JSON.stringify(s)),

    getHistory: (): HistoryEntry[] => readJSON<HistoryEntry[]>(kv, K.history, []),
    getEntry(id: string): HistoryEntry | undefined {
      return this.getHistory().find((e) => e.id === id);
    },
    addEntry(e: HistoryEntry) {
      const list = [e, ...this.getHistory().filter((x) => x.id !== e.id)];
      // Favourites survive the cap.
      const kept = list.filter((x, i) => i < HISTORY_CAP || x.favourite);
      kv.set(K.history, JSON.stringify(kept));
    },
    updateEntry(id: string, patch: Partial<HistoryEntry>) {
      const list = this.getHistory().map((e) => (e.id === id ? { ...e, ...patch } : e));
      kv.set(K.history, JSON.stringify(list));
    },
    /** Replaces history (after merging the account's scans), keeping the same cap rules. */
    setHistory(list: HistoryEntry[]) {
      kv.set(K.history, JSON.stringify(list.filter((x, i) => i < HISTORY_CAP || x.favourite)));
    },
    removeEntry(id: string) {
      kv.set(K.history, JSON.stringify(this.getHistory().filter((e) => e.id !== id)));
    },

    getProduct(barcode: string): CachedProduct | undefined {
      return readJSON<Record<string, CachedProduct>>(kv, K.products, {})[barcode];
    },
    putProduct(p: CachedProduct) {
      const all = readJSON<Record<string, CachedProduct>>(kv, K.products, {});
      all[p.barcode] = p;
      const sorted = Object.values(all).sort((a, b) => b.at.localeCompare(a.at)).slice(0, PRODUCTS_CAP);
      kv.set(K.products, JSON.stringify(Object.fromEntries(sorted.map((x) => [x.barcode, x]))));
    },

    getCachedBundle: (): RulesBundle | null => readJSON<RulesBundle | null>(kv, K.rules, null),
    setCachedBundle: (b: RulesBundle) => kv.set(K.rules, JSON.stringify(b)),

    /** Set by the purchases adapter (RevenueCat) when an active entitlement exists. */
    getLabelScript: (): LabelScript => {
      const v = kv.getString(K.labelScript);
      return LABEL_SCRIPTS.some((x) => x.id === v) ? (v as LabelScript) : 'latin';
    },
    setLabelScript: (v: LabelScript) => kv.set(K.labelScript, v),
    isPremium: () => kv.getString(K.premium) === '1',
    setPremium: (on: boolean) => (on ? kv.set(K.premium, '1') : kv.remove(K.premium)),

    getLimits: () => readJSON<{ day: string; label: number; ai: number }>(kv, K.limits, { day: '', label: 0, ai: 0 }),
    setLimits: (l: { day: string; label: number; ai: number }) => kv.set(K.limits, JSON.stringify(l)),

    /** Delete-my-data, local part: everything except the starter rules cache. */
    wipe() {
      const bundle = kv.getString(K.rules);
      kv.clearAll();
      if (bundle) kv.set(K.rules, bundle);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
