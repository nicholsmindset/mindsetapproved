import Link from 'next/link';
import styles from './site.module.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Mindset Approved
        </Link>
        <nav className={styles.nav} aria-label="Site">
          <Link href="/rules">The rules</Link>
          <Link href="/corrections">Corrections</Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/rules">The rules</Link>
        </nav>
        <p>
          Mindset Approved is not a medical device and does not diagnose, treat, cure or prevent any condition. Verdicts reflect
          Mindset’s ingredient preferences.
        </p>
        <p>Product data from Open Food Facts, available under the Open Database License. © ONN Group LLP.</p>
      </footer>
    </div>
  );
}
