'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';

const LINKS = [
  ['/admin/test-bench', 'Test bench'],
  ['/admin/ingredients', 'Ingredients'],
  ['/admin/unmatched', 'Unmatched'],
  ['/admin/reports', 'Reports'],
  ['/admin/corrections', 'Corrections'],
  ['/admin/publish', 'Publish'],
  ['/admin/products', 'Products'],
  ['/admin/stats', 'Stats'],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Admin">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={styles.link} aria-current={path.startsWith(href) ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
