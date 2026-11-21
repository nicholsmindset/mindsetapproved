import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** Only /admin is private; the site, share pages and auth callback are public. */
const OPEN_ADMIN_PATHS = ['/admin/login', '/admin/setup'];

/** Refreshes the Supabase session on /admin and keeps non-admins out of it. */
export async function proxy(request: NextRequest) {
  const isAdmin = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/');
  if (!isAdmin) return NextResponse.next();
  // Offline mode: no project configured, pages fall back to the starter rules or a setup notice.
  if (!URL_ || !KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(URL_, KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (OPEN_ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return response;

  if (data.user?.app_metadata?.['role'] !== 'admin') {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.search = data.user ? '?error=not_admin' : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
