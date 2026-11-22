import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShared, shareDetail, shareSummary, VERDICT_LABEL } from '@/lib/share';
import styles from './share.module.css';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getShared((await params).code);
  if (!s) return { title: 'Mindset Approved', robots: { index: false } };
  const title = `${VERDICT_LABEL[s.verdict]}${s.product_name ? `: ${s.product_name}` : ''} | Mindset Approved`;
  return {
    title,
    description: shareSummary(s),
    // Verdicts are about ingredients, not companies: keep shared pages out of search results.
    robots: { index: false, follow: false },
    openGraph: { title, description: shareSummary(s), type: 'website' },
    twitter: { card: 'summary_large_image', title, description: shareSummary(s) },
  };
}

export default async function SharedVerdictPage({ params }: Props) {
  const s = await getShared((await params).code);
  if (!s) notFound();
  const summary = shareSummary(s);
  const flagged = s.chips.filter((c) => c.tier !== 'good');
  const good = s.chips.filter((c) => c.tier === 'good');

  return (
    <main className={styles.page}>
      <header className={styles.brand}>
        <span className={styles.mark} aria-hidden>
          ✓
        </span>
        Mindset Approved
      </header>

      <section className={`${styles.verdict} ${styles[s.verdict]}`} aria-label={summary}>
        <p className={styles.product}>{s.product_name ? [s.product_name, s.brand].filter(Boolean).join(' · ') : 'A product scanned with Mindset Approved'}</p>
        <div className={styles.headline}>
          <span className={styles.icon} aria-hidden>
            {s.verdict === 'approved' ? '✓' : s.verdict === 'caution' ? '!' : s.verdict === 'not_approved' ? '✕' : '?'}
          </span>
          <h1>{VERDICT_LABEL[s.verdict]}</h1>
        </div>
        <p className={styles.summary}>{shareDetail(summary)}</p>
      </section>

      {flagged.length ? (
        <section>
          <h2>Why</h2>
          <ul className={styles.chips}>
            {flagged.map((c) => (
              <li key={c.ingredient_id} className={styles[`chip_${c.tier}`]}>
                <strong>{c.name}</strong>
                <span className={styles.tier}>{c.tier === 'bad' ? "Doesn't meet Mindset rules" : 'Borderline'}</span>
                <p>{c.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {good.length ? (
        <section>
          <h2>Good signs</h2>
          <ul className={styles.chips}>
            {good.map((c) => (
              <li key={c.ingredient_id} className={styles.chip_good}>
                <strong>{c.name}</strong>
                <p>{c.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className={styles.foot}>
        <p>
          This verdict describes ingredients, not the company that makes the product. It reflects Mindset’s ingredient
          preferences{s.rules_version ? ` (rules v${s.rules_version})` : ''} at the time of the scan, and the person who
          scanned it may use their own rule settings.
        </p>
        <p>
          Mindset Approved is not a medical device and does not diagnose, treat, cure or prevent any condition. Talk to a
          healthcare professional about your diet.
        </p>
        <p className={styles.cta}>Scan any label with the Mindset Approved app, coming soon to iOS and Android.</p>
      </footer>
    </main>
  );
}
