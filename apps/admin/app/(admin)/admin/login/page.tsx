import Link from 'next/link';
import { hasSupabase } from '@/lib/env';
import { safeNextPath } from '@/lib/safe-path';
import { LoginForm } from './LoginForm';

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, '/admin/test-bench');
  return (
    <div className="card stack" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1>Sign in</h1>
      {!hasSupabase ? (
        <p>
          No Supabase project is configured. See <Link href="/admin/setup">setup</Link>, or use the{' '}
          <Link href="/admin/test-bench">test bench</Link> in offline mode.
        </p>
      ) : (
        <>
          {sp.error === 'not_admin' ? (
            <div className="flash error">This account doesn&apos;t have the admin role.</div>
          ) : sp.error ? (
            <div className="flash error">{sp.error}</div>
          ) : null}
          <p className="muted small">Only accounts with the admin role can use this dashboard.</p>
          <LoginForm next={next} />
        </>
      )}
    </div>
  );
}
