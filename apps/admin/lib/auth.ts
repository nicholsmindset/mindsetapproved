import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { hasSupabase } from './env';
import { createClient } from './supabase/server';

/** Same claim as public.is_admin() in the database. */
export function isAdmin(user: Pick<User, 'app_metadata'> | null | undefined): boolean {
  return user?.app_metadata?.['role'] === 'admin';
}

/** For data pages: returns a client for the signed-in admin, or redirects to /login. */
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  if (!hasSupabase) redirect('/admin/setup');
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/admin/login');
  if (!isAdmin(data.user)) redirect('/admin/login?error=not_admin');
  return { supabase, user: data.user };
}
