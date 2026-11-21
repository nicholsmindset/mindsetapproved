import 'server-only';
import { compileBundle, type RulesBundle } from '@mindset/rules-engine';
import { createClient } from '@supabase/supabase-js';
import { hasSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { fetchBundle, starterDraft, type RuleVersion } from './rules';

/** The rules phones are using right now: the latest published bundle, or the starter rules before the first publish. */
export async function publishedBundle(): Promise<{ bundle: RulesBundle; published: RuleVersion | null }> {
  if (hasSupabase) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const { data } = await sb.rpc('latest_rule_version');
      const latest = ((data as RuleVersion[] | null) ?? [])[0];
      if (latest) return { bundle: await fetchBundle(latest.bundle_url), published: latest };
    } catch {
      // fall back to the starter rules
    }
  }
  return { bundle: compileBundle({ ...starterDraft(), version: 1, generatedAt: 'starter' }), published: null };
}
