'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

interface PublishResponse {
  published: boolean;
  version?: number;
  bundleUrl?: string;
  error?: string;
}

/**
 * Calls the publish-bundle Edge Function with the admin's own access token; the function repeats
 * every check server-side. PUBLISH_FUNCTION_URL overrides the default route (e.g. a locally served function).
 */
export async function publish(form: FormData) {
  const { supabase } = await requireAdmin();
  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) redirect('/admin/login');

  const url = process.env.PUBLISH_FUNCTION_URL || `${SUPABASE_URL}/functions/v1/publish-bundle`;
  let body: PublishResponse | null = null;
  let message: string | undefined;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: String(form.get('notes') ?? '').trim() || undefined, acceptFailures: form.get('accept') === 'on' }),
      cache: 'no-store',
    });
    body = (await res.json().catch(() => null)) as PublishResponse | null;
    if (!res.ok || !body?.published) message = body?.error ?? `Publish failed (${res.status})`;
  } catch (e) {
    message = `Could not reach the publish-bundle function: ${(e as Error).message}`;
  }
  if (message) redirect(`/admin/publish?error=${encodeURIComponent(message)}`);
  revalidatePath('/admin/publish');
  redirect(`/admin/publish?ok=${encodeURIComponent(`Published rules v${body!.version}. Phones pick it up on their next app open.`)}`);
}
