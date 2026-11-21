import type { Metadata } from 'next';
import styles from '../site.module.css';

export const metadata: Metadata = { title: 'Privacy | Mindset Approved' };

export default function Privacy() {
  return (
    <article className={styles.prose}>
      <h1>Privacy policy</h1>
      <p className={styles.draft}>Draft for legal review before launch. Not yet in force.</p>
      <p>
        Mindset Approved is operated by ONN Group LLP, Singapore (“we”). This policy explains what the app and this website collect, why, and
        your choices, in line with Singapore’s Personal Data Protection Act 2012 (PDPA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Scans.</strong> When you scan, we receive the verdict, the ingredients that matched, the barcode (if any), the source (barcode
          database, label photo or AI re-check), the rules version, and for label scans the ingredient text read from the photo. They are linked
          to a random install ID created on your phone, or to your account if you sign in.
        </li>
        <li>
          <strong>Unrecognised words</strong> from ingredient lists, without anything that identifies you, so we can improve the database.
        </li>
        <li>
          <strong>Reports and corrections</strong> you send, including any comment or contact email you choose to give.
        </li>
        <li>
          <strong>Account (optional).</strong> Your email address and your rule settings, if you sign in.
        </li>
      </ul>

      <h2>What we don’t collect</h2>
      <ul>
        <li>Label photos are read on your phone and are not stored. If you tap “Re-check with AI”, the photo is sent once to our AI provider to read the text and is not kept.</li>
        <li>No location, contacts, advertising ID, or health information.</li>
        <li>No ads, and we don’t sell personal data.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>To give you verdicts and keep your history and settings, to improve the ingredient database, to fix wrong verdicts, and to prevent abuse (for example daily limits on AI re-checks).</p>

      <h2>Who processes it</h2>
      <p>
        Our database and hosting provider (Supabase), our website host (Vercel), and, only when you use “Re-check with AI”, Google’s Gemini API.
        Barcode lookups go from your phone to Open Food Facts.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Scanning never needs an account.</li>
        <li>
          <strong>Delete my data</strong> in Settings removes your history and settings from your phone, and the scans, reports and shared links sent
          from it (and your account’s data if you’re signed in) from our servers.
        </li>
        <li>You can ask us for a copy of your data or to correct it through the corrections page.</li>
      </ul>

      <h2>Retention</h2>
      <p>We keep scans while your install or account is active, and delete them when you use Delete my data. Anonymous, aggregated statistics may be kept.</p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, write to us through the corrections page (say it’s a privacy request) or contact our Data Protection Officer at the address published at launch.</p>
    </article>
  );
}
