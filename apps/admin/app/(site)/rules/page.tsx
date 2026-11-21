import type { Tier } from '@mindset/rules-engine';
import type { Metadata } from 'next';
import { publishedBundle } from '@/lib/published';
import styles from '../site.module.css';
import r from './rules.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'The rules | Mindset Approved',
  description: 'Every ingredient rule Mindset Approved uses, with its tier and the reason behind it.',
};

const TIER_LABEL: Record<Tier, string> = { bad: 'Not Approved', borderline: 'Caution', neutral: 'Neutral', good: 'Good sign' };
const ORDER: Record<Tier, number> = { bad: 0, borderline: 1, neutral: 2, good: 3 };

export default async function RulesPage() {
  const { bundle, published } = await publishedBundle();
  const aliasesById = new Map<string, string[]>();
  for (const [alias, id] of Object.entries(bundle.aliases)) (aliasesById.get(id) ?? aliasesById.set(id, []).get(id)!).push(alias);
  const codesById = new Map<string, string[]>();
  for (const [code, id] of Object.entries(bundle.eNumbers)) (codesById.get(id) ?? codesById.set(id, []).get(id)!).push(code.toUpperCase());
  const categories = bundle.categories.filter((c) => c.id !== 'basic' && c.id !== 'unreviewed');
  const rules = bundle.ingredients.filter((i) => i.tier !== 'neutral' || i.strictTier !== 'neutral');

  return (
    <div>
      <div className={styles.prose}>
        <h1>The rules</h1>
        <p>
          Every ingredient Mindset Approved flags, what it’s called on labels, and why. These are Mindset’s ingredient preferences, not safety
          findings. In the app you can switch any category or ingredient off.
        </p>
        <p className="muted small">
          {published ? `Rules version ${bundle.version}, published ${new Date(published.published_at).toLocaleDateString('en-SG')}.` : 'Starter rules.'}{' '}
          {rules.length} flagged or highlighted ingredients, {Object.keys(bundle.aliases).length + Object.keys(bundle.eNumbers).length} label spellings.
        </p>
        <div className={r.legend}>
          <span className="pill tier-bad">Not Approved</span>
          <span className="pill tier-borderline">Caution</span>
          <span className="pill tier-good">Good sign</span>
          <span className="muted small">“Strict” shows the tier when Strict mode is on.</span>
        </div>
      </div>
      {categories.map((cat) => {
        const list = rules.filter((i) => i.category === cat.id).sort((a, b) => ORDER[a.tier] - ORDER[b.tier] || a.name.localeCompare(b.name));
        if (!list.length) return null;
        return (
          <section key={cat.id} className={r.category} id={cat.id}>
            <h2>{cat.label}</h2>
            <div className={r.list}>
              {list.map((i) => (
                <article key={i.id} className={`${r.rule} ${r[`edge_${i.tier}`]}`}>
                  <header>
                    <h3>{i.name}</h3>
                    <span className={`pill tier-${i.tier}`}>{TIER_LABEL[i.tier]}</span>
                    {i.strictTier !== i.tier ? <span className={`pill tier-${i.strictTier}`}>Strict: {TIER_LABEL[i.strictTier]}</span> : null}
                  </header>
                  <p>{i.reason}</p>
                  <details>
                    <summary>How it appears on labels</summary>
                    <p className={r.aliases}>{[...(codesById.get(i.id) ?? []), ...(aliasesById.get(i.id) ?? [])].join(' · ')}</p>
                  </details>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
