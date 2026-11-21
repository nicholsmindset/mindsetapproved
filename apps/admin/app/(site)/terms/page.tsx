import type { Metadata } from 'next';
import styles from '../site.module.css';

export const metadata: Metadata = { title: 'Terms | Mindset Approved' };

export default function Terms() {
  return (
    <article className={styles.prose}>
      <h1>Terms of use</h1>
      <p className={styles.draft}>Draft for legal review before launch. Not yet in force.</p>
      <h2>What the app is</h2>
      <p>
        Mindset Approved is an ingredient-preference filter. It compares ingredient lists with Mindset’s stated ingredient preferences and your own
        rule settings. Verdicts describe ingredients, not the companies that make products.
      </p>
      <h2>Not medical advice</h2>
      <p>
        Mindset Approved is not a medical device and does not diagnose, treat, cure or prevent any condition. It does not assess allergens,
        nutrition or food safety. Always read the product label, and talk to a healthcare professional about your diet, allergies or any condition.
      </p>
      <h2>Accuracy</h2>
      <p>
        Verdicts depend on the ingredient text available, which can be incomplete, out of date or misread. When a label can’t be read clearly, the
        app shows “Can’t verify” instead of a verdict. Ingredient data may come from Open Food Facts and from other users. Report a wrong verdict in
        the app, or send a correction.
      </p>
      <h2>Sharing</h2>
      <p>If you share a verdict, you agree not to present it as a statement about a company or as health advice.</p>
      <h2>Subscriptions</h2>
      <p>Premium plans, when offered, are billed through the App Store or Google Play and can be cancelled there at any time.</p>
      <h2>Data sources</h2>
      <p>Contains data from Open Food Facts, available under the Open Database License (ODbL).</p>
    </article>
  );
}
