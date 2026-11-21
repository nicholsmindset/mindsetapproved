import 'server-only';
import { summaryFor, type Chip, type Tier, type Verdict } from '@mindset/rules-engine';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from './env';

export interface SharedVerdict {
  code: string;
  verdict: Verdict;
  created_at: string;
  rules_version: number | null;
  /** Only set when an admin verified the product. */
  product_name: string | null;
  brand: string | null;
  chips: Array<{ ingredient_id: string; name: string; short_name: string; tier: Tier; reason: string }>;
}

/** Public, cookie-less read through get_shared_verdict(); cached per request (page + metadata + image). */
export const getShared = cache(async (code: string): Promise<SharedVerdict | null> => {
  if (!hasSupabase || !/^[A-Za-z0-9_-]{8}$/.test(code)) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('get_shared_verdict', { p_code: code });
  if (error || !data) return null;
  return data as SharedVerdict;
});

/** Same sentence the app shows ("Not Approved — contains canola oil and Red 40."). */
export function shareSummary(s: SharedVerdict): string {
  const chips = s.chips.map(
    (c) => ({ ingredientId: c.ingredient_id, name: c.name, shortName: c.short_name, tier: c.tier }) as Chip,
  );
  return summaryFor(s.verdict, chips.filter((c) => c.tier === 'bad' || c.tier === 'borderline'));
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  approved: 'Mindset Approved',
  caution: 'Caution',
  not_approved: 'Not Approved',
  cant_verify: "Can't verify",
};

/** "Not Approved — contains X." -> "Contains X." (the verdict is already the heading). */
export function shareDetail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
