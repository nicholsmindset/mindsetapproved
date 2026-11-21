'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

const back = (key: 'ok' | 'error', msg: string): never => redirect(`/admin/unmatched?${key}=${encodeURIComponent(msg)}`);

export async function mapTerm(form: FormData) {
  const { supabase } = await requireAdmin();
  const term = String(form.get('term') ?? '');
  // The picker shows "id — name"; accept either form.
  const ingredientId = String(form.get('ingredient_id') ?? '').split(' — ')[0]!.trim();
  if (!ingredientId) back('error', `Choose an ingredient for "${term}".`);
  const { error } = await supabase.rpc('map_unmatched', { p_term: term, p_ingredient_id: ingredientId });
  if (error) back('error', error.message);
  revalidatePath('/admin/unmatched');
  back('ok', `"${term}" now matches ${ingredientId} (after the next publish).`);
}

export async function setStatus(form: FormData) {
  const { supabase } = await requireAdmin();
  const term = String(form.get('term') ?? '');
  const status = String(form.get('status') ?? '');
  if (!['new', 'ignored'].includes(status)) back('error', 'Unknown status.');
  const { error } = await supabase.from('unmatched_terms').update({ status }).eq('term_norm', term);
  if (error) back('error', error.message);
  revalidatePath('/admin/unmatched');
  back('ok', status === 'ignored' ? `Ignored "${term}".` : `Moved "${term}" back to the queue.`);
}
