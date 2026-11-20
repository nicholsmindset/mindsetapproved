import 'server-only';
import { gunzipSync } from 'node:zlib';
import { compileBundle, rowsFromSource, type CompileInput, type RuleSource, type RulesBundle } from '@mindset/rules-engine';
import starter from '@mindset/rules-data/starter-rules.json';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Draft = Omit<CompileInput, 'version'>;

export interface RuleVersion {
  version: number;
  published_at: string;
  bundle_url: string;
  ingredient_count: number;
  alias_count: number;
  notes: string | null;
}

export function starterDraft(): Draft {
  const { version: _v, ...rest } = rowsFromSource(starter as RuleSource);
  return rest;
}

/** The live (unpublished) rules: what the next publish would ship. */
export async function loadDraft(supabase: SupabaseClient): Promise<Draft> {
  const { data, error } = await supabase.rpc('export_rules');
  if (error) throw new Error(`export_rules failed: ${error.message}`);
  return data as Draft;
}

export async function latestVersion(supabase: SupabaseClient): Promise<RuleVersion | null> {
  const { data, error } = await supabase.rpc('latest_rule_version');
  if (error) throw new Error(`latest_rule_version failed: ${error.message}`);
  return ((data as RuleVersion[] | null) ?? [])[0] ?? null;
}

export async function fetchBundle(url: string): Promise<RulesBundle> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not download ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return JSON.parse(text) as RulesBundle;
}

/** Compiles a draft for previewing; returns problems instead of throwing. */
export function tryCompile(draft: Draft, version = 0): { bundle: RulesBundle | null; problems: string[] } {
  try {
    return { bundle: compileBundle({ ...draft, version }), problems: [] };
  } catch (e) {
    const problems = (e as { problems?: string[] }).problems ?? [(e as Error).message];
    return { bundle: null, problems };
  }
}
