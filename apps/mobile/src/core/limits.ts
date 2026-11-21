import type { Store } from './store';

/** PRD free plan: 10 label scans and 3 AI re-checks a day. Barcode scans are unlimited. */
export const FREE_LIMITS = { label: 10, ai: 3 } as const;
export type LimitKind = keyof typeof FREE_LIMITS;

/** Local calendar day, so limits reset at the user's midnight. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function remaining(store: Store, kind: LimitKind, now = new Date()): number {
  if (store.isPremium()) return Number.POSITIVE_INFINITY;
  const l = store.getLimits();
  const used = l.day === dayKey(now) ? l[kind] : 0;
  return Math.max(0, FREE_LIMITS[kind] - used);
}

/** Records one use. Returns false (and records nothing) when today's limit is used up. */
export function consume(store: Store, kind: LimitKind, now = new Date()): boolean {
  if (remaining(store, kind, now) <= 0) return false;
  if (store.isPremium()) return true;
  const l = store.getLimits();
  const today = dayKey(now);
  const base = l.day === today ? l : { day: today, label: 0, ai: 0 };
  store.setLimits({ ...base, [kind]: base[kind] + 1 });
  return true;
}
