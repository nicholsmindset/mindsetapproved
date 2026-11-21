'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export async function closeCorrection(form: FormData) {
  const { supabase } = await requireAdmin();
  const status = String(form.get('status'));
  if (!['fixed', 'no_change'].includes(status)) redirect('/admin/corrections?error=Unknown%20status');
  const { error } = await supabase
    .from('corrections')
    .update({ status, admin_note: String(form.get('note') ?? '').trim() || null, resolved_at: new Date().toISOString() })
    .eq('id', String(form.get('id')));
  if (error) redirect(`/admin/corrections?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/corrections');
  redirect('/admin/corrections?ok=Correction%20closed.');
}
