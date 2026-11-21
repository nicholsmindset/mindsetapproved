'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export async function closeReport(form: FormData) {
  const { supabase } = await requireAdmin();
  const status = String(form.get('status'));
  if (!['resolved', 'dismissed'].includes(status)) redirect('/reports?error=Unknown%20status');
  const { error } = await supabase
    .from('reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', String(form.get('id')));
  if (error) redirect(`/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/reports');
  redirect(`/reports?ok=${encodeURIComponent(`Report ${status}.`)}`);
}
