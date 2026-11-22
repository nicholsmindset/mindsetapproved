import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'Mindset Approved: scan a label, see what’s in it',
  description:
    'Scan a barcode or photograph any ingredient list and get Approved, Caution or Not Approved in seconds, with the exact ingredients behind every verdict.',
};

const VERDICTS = [
  { key: 'approved', label: 'Mindset Approved', body: 'No flagged ingredients found, and the label was read clearly.', example: 'Potatoes, avocado oil, sea salt' },
  { key: 'caution', label: 'Caution', body: 'Borderline ingredients, such as natural flavours or added sugar. Your call.', example: 'Oats, cane sugar, natural flavor' },
  { key: 'not_approved', label: 'Not Approved', body: 'Contains ingredients Mindset rules avoid, such as seed oils, synthetic dyes or artificial sweeteners.', example: 'Corn, canola oil, Red 40' },
] as const;

const DIFFERENCES = [
  ['Scans any label', 'Photograph the ingredient list, even when the product isn’t in a barcode database. Imported and local products included.'],
  ['Three verdicts, not two', 'A Caution tier for borderline ingredients, instead of marking almost everything Not Approved.'],
  ['Every reason shown', 'Tap any flagged ingredient to see the rule behind it. The whole rule list is public.'],
  ['Good signs too', '“Made with avocado oil” is highlighted, not just the ingredients to avoid.'],
  ['Your rules', 'Turn on Strict mode, or switch off what you don’t care about, like added sugar.'],
  ['Gets better every week', 'Words the app doesn’t recognise yet are reviewed and added, so coverage grows with every scan.'],
] as const;

export default function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <h1>Know what’s in it before it’s in your basket.</h1>
          <p className={styles.lede}>
            Scan a barcode or photograph any ingredient list. In about two seconds Mindset Approved tells you Approved, Caution or Not Approved,
            with the exact ingredients behind every verdict.
          </p>
          <div className={styles.ctas}>
            <span className={styles.soon}>Coming soon to iOS and Android</span>
            <Link href="/rules" className={styles.secondary}>
              See the rules
            </Link>
          </div>
        </div>
        <div className={styles.device}>
          <picture>
            <source srcSet="/app/result-dark.webp" media="(prefers-color-scheme: dark)" />
            <img src="/app/result-light.webp" width={390} height={848} alt="The app showing Not Approved for a biscuit label, with Yellow 5, added sugar and palm oil flagged on the ingredient list" />
          </picture>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Three verdicts</h2>
        <div className={styles.grid3}>
          {VERDICTS.map((v) => (
            <article key={v.key} className={styles.card}>
              <span className={`${styles.dot} ${styles[`dot_${v.key}`]}`} aria-hidden>
                {v.key === 'approved' ? '✓' : v.key === 'caution' ? '!' : '✕'}
              </span>
              <h3 className={styles[`label_${v.key}`]}>{v.label}</h3>
              <p>{v.body}</p>
              <p className={styles.example}>e.g. {v.example}</p>
            </article>
          ))}
        </div>
        <p className={styles.note}>
          If a photo is too blurry to be sure, you get <strong>Can’t verify</strong> instead. The app never says Approved on a bad read.
        </p>
      </section>

      <section className={styles.section}>
        <h2>How it works</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Scan.</strong> Point at the barcode. If the product isn’t in a database, snap the ingredient list instead.
          </li>
          <li>
            <strong>Read.</strong> The label is read on your phone and matched against the Mindset rules, also on your phone, in milliseconds.
          </li>
          <li>
            <strong>Decide.</strong> See the verdict and tap any ingredient for the reason. Fix a misread word and re-check instantly.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2>What makes it different</h2>
        <div className={styles.grid3}>
          {DIFFERENCES.map(([title, body]) => (
            <article key={title} className={styles.card}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Questions</h2>
        <div className={styles.faq}>
          <details>
            <summary>Is this medical or nutrition advice?</summary>
            <p>
              No. Mindset Approved is an ingredient-preference filter. It does not diagnose, treat, cure or prevent any condition, and it doesn’t
              score calories or nutrients. Talk to a healthcare professional about your diet.
            </p>
          </details>
          <details>
            <summary>Why are seed oils flagged?</summary>
            <p>
              Avoiding industrial seed oils is a Mindset preference, and the app labels it as one. Mainstream nutrition science does not treat seed
              oils as harmful. If you don’t share the preference, switch the category off and they count as neutral.
            </p>
          </details>
          <details>
            <summary>Does a verdict say anything about the brand?</summary>
            <p>Verdicts describe ingredients, never companies. Manufacturers can send corrections, and we fix errors quickly.</p>
          </details>
          <details>
            <summary>What happens to my photos?</summary>
            <p>Label photos are read on your phone and never stored. See the <Link href="/privacy">privacy policy</Link>.</p>
          </details>
        </div>
      </section>
    </>
  );
}
