import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { hasSupabase } from '@/lib/env';
import { signOut } from './actions';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Mindset Approved Admin',
  description: 'Rules editor, review queues and publishing for Mindset Approved.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <aside className={styles.side}>
            <Link href="/test-bench" className={styles.brand}>
              <span className={styles.mark} aria-hidden>
                MA
              </span>
              <span>
                Mindset Approved
                <small>Admin</small>
              </span>
            </Link>
            <Nav />
            <div className={styles.foot}>
              {hasSupabase ? (
                <form action={signOut}>
                  <button type="submit">Sign out</button>
                </form>
              ) : (
                <span>Offline mode: starter rules</span>
              )}
            </div>
          </aside>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
