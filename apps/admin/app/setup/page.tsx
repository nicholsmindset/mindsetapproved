import Link from 'next/link';
import { hasSupabase } from '@/lib/env';

export default function Setup() {
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Connect Supabase</h1>
      {hasSupabase ? (
        <p>
          Supabase is configured. <Link href="/ingredients">Open the ingredients editor</Link>.
        </p>
      ) : (
        <>
          <p>
            The admin is running in offline mode. The <Link href="/test-bench">test bench</Link> works against the starter
            rules; the editors, queues and publishing need a Supabase project.
          </p>
          <ol className="small">
            <li>
              Apply <code>supabase/migrations</code> and <code>supabase/seed.sql</code> to the project.
            </li>
            <li>
              Copy <code>apps/admin/.env.example</code> to <code>apps/admin/.env.local</code> and fill in the project URL and
              anon key.
            </li>
            <li>
              Give your user the admin role: set <code>app_metadata.role = &quot;admin&quot;</code> (Authentication → Users, or
              the service-role API).
            </li>
            <li>
              Deploy the <code>publish-bundle</code> Edge Function.
            </li>
          </ol>
        </>
      )}
    </div>
  );
}
