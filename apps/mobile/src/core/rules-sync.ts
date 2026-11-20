import { loadRules, type Rules, type RulesBundle } from '@mindset/rules-engine';
import type { Store } from './store';

export interface LatestVersion {
  version: number;
  bundle_url: string;
}

export interface SyncDeps {
  store: Store;
  /** latest_rule_version() RPC; null when nothing is published. */
  fetchLatest: () => Promise<LatestVersion | null>;
  /** Downloads a bundle URL and returns its decompressed JSON text. */
  download: (url: string) => Promise<string>;
}

/** Rules to use right now: the cached bundle if it is newer than the one shipped in the app. Never blocks on the network. */
export function initialRules(store: Store, shipped: RulesBundle): Rules {
  const cached = store.getCachedBundle();
  if (cached && cached.version >= shipped.version) {
    try {
      return loadRules(cached);
    } catch {
      // corrupt cache: fall through to the shipped bundle
    }
  }
  return loadRules(shipped);
}

export type SyncResult =
  | { status: 'updated'; rules: Rules }
  | { status: 'current' }
  | { status: 'offline'; error: string };

/** Checks for a newer published bundle and caches it. Failures keep the current rules. */
export async function checkForUpdate(current: Rules, deps: SyncDeps): Promise<SyncResult> {
  let latest: LatestVersion | null;
  try {
    latest = await deps.fetchLatest();
  } catch (e) {
    return { status: 'offline', error: (e as Error).message };
  }
  if (!latest || latest.version <= current.bundle.version) return { status: 'current' };
  try {
    const bundle = JSON.parse(await deps.download(latest.bundle_url)) as RulesBundle;
    if (bundle.version !== latest.version) throw new Error(`bundle says v${bundle.version}, expected v${latest.version}`);
    const rules = loadRules(bundle); // validates the schema before caching
    deps.store.setCachedBundle(bundle);
    return { status: 'updated', rules };
  } catch (e) {
    return { status: 'offline', error: (e as Error).message };
  }
}
