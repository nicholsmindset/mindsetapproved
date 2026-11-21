'use server';
import { aliasNorm, type Tier } from '@mindset/rules-engine';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { TIERS } from '@/lib/types';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const tierOrNull = (v: string): Tier | null => (TIERS.includes(v as Tier) ? (v as Tier) : null);
const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);
const back = (path: string, key: 'ok' | 'error', msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

export async function createIngredient(form: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(form, 'display_name');
  const category = str(form, 'category');
  const id = (str(form, 'id') || name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const mapTerm = str(form, 'map_term');
  if (!name || !id) back('/admin/ingredients', 'error', 'Give the ingredient a name.');
  const { error } = await supabase.from('ingredients').insert({ id, display_name: name, category, is_active: false });
  if (error) back('/admin/ingredients', 'error', error.message);
  // Every ingredient matches at least its own name.
  await supabase.from('aliases').upsert({ alias: name, alias_norm: '', ingredient_id: id, kind: 'name' }, { onConflict: 'alias_norm', ignoreDuplicates: true });
  if (mapTerm) {
    const { error: mapError } = await supabase.rpc('map_unmatched', { p_term: mapTerm, p_ingredient_id: id });
    if (mapError) back(`/admin/ingredients/${id}`, 'error', `Created, but mapping "${mapTerm}" failed: ${mapError.message}`);
  }
  revalidatePath('/admin/ingredients');
  back(`/admin/ingredients/${id}`, 'ok', 'Created. Give it a tier and a reason, then activate it.');
}

export async function updateIngredient(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, 'id');
  const path = `/admin/ingredients/${id}`;
  const tier = tierOrNull(str(form, 'tier'));
  const strictTier = tierOrNull(str(form, 'strict_tier'));
  const isActive = form.get('is_active') === 'on';
  const reason = str(form, 'reason_short');
  if (isActive && (!tier || !strictTier)) back(path, 'error', 'An active ingredient needs a tier and a strict tier.');
  if (isActive && (tier !== 'neutral' || strictTier !== 'neutral') && !reason) {
    back(path, 'error', 'A flagged ingredient needs a short reason. Keep it neutral and factual.');
  }
  if (/\b(toxic|poison|dangerous|cancer|disease)\b/i.test(reason)) {
    back(path, 'error', 'Reasons must avoid health claims ("toxic", "dangerous", "cancer"…). Say what the rule is, e.g. "doesn\'t meet Mindset rules".');
  }
  const { error } = await supabase
    .from('ingredients')
    .update({
      display_name: str(form, 'display_name'),
      short_name: str(form, 'short_name') || null,
      category: str(form, 'category'),
      tier,
      strict_tier: strictTier,
      reason_short: reason,
      reason_long: str(form, 'reason_long') || null,
      learn_more_url: str(form, 'learn_more_url') || null,
      sources: { regulator: lines(str(form, 'sources_regulator')), preference: lines(str(form, 'sources_preference')) },
      is_active: isActive,
    })
    .eq('id', id);
  if (error) back(path, 'error', error.message);
  revalidatePath(path);
  back(path, 'ok', 'Saved. Changes reach phones after the next publish.');
}

export async function addAliases(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, 'ingredient_id');
  const path = `/admin/ingredients/${id}`;
  const kind = str(form, 'kind') as 'name' | 'e_number' | 'ocr_misspelling';
  const rows = lines(str(form, 'aliases')).filter((alias) => {
    try {
      return aliasNorm({ alias, kind }) !== '';
    } catch {
      return false;
    }
  });
  if (!rows.length) back(path, 'error', 'No valid aliases to add.');
  const { data, error } = await supabase
    .from('aliases')
    .upsert(
      rows.map((alias) => ({ alias, alias_norm: '', ingredient_id: id, kind, lang: 'en' })),
      { onConflict: 'alias_norm', ignoreDuplicates: true },
    )
    .select('id');
  if (error) back(path, 'error', error.message);
  const added = data?.length ?? 0;
  revalidatePath(path);
  back(path, 'ok', `Added ${added} alias${added === 1 ? '' : 'es'}${added < rows.length ? `; skipped ${rows.length - added} that were duplicates or belong to another ingredient` : ''}.`);
}

export async function deleteAlias(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, 'ingredient_id');
  const { error } = await supabase.from('aliases').delete().eq('id', Number(str(form, 'alias_id')));
  if (error) back(`/admin/ingredients/${id}`, 'error', error.message);
  revalidatePath(`/admin/ingredients/${id}`);
  back(`/admin/ingredients/${id}`, 'ok', 'Alias removed.');
}
