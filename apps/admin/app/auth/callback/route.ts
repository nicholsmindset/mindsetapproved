import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/safe-path';
import { createClient } from '@/lib/supabase/server';

/**
 * Relative redirect, so the browser stays on the host it used. An absolute URL built from
 * request.nextUrl can name a different host (localhost vs 127.0.0.1, or the internal host behind a
 * proxy), and the session cookie set here would not be sent there.
 */
function redirectTo(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

/** Magic-link landing: exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const nextParam = params.get('next');
  const next = safeNextPath(nextParam, '/admin/test-bench');
  if (!code) return redirectTo('/admin/login?error=Missing%20sign-in%20code');
  const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
  if (error) return redirectTo(`/admin/login?error=${encodeURIComponent(error.message)}`);
  return redirectTo(next);
}
