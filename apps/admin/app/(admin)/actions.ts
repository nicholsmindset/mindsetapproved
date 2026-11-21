'use server';
import { redirect } from 'next/navigation';
import { hasSupabase } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  if (hasSupabase) await (await createClient()).auth.signOut();
  redirect('/admin/login');
}
