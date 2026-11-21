'use client';
import { analyze, DEFAULT_SETTINGS, loadRules, type LabelFixture, type RulesBundle, type UserSettings } from '@mindset/rules-engine';
import { useMemo, useState } from 'react';
import { ResultDetail, VerdictBanner } from '@/components/Result';
import styles from './TestBench.module.css';

const EXAMPLE = 'Ingredients: Corn, canola oil, salt, Red 40.';

export function TestBench({ draft, published, samples }: { draft: RulesBundle; published: RulesBundle | null; samples: LabelFixture[] }) {
  const draftRules = useMemo(() => loadRules(draft), [draft]);
  const publishedRules = useMemo(() => (published ? loadRules(published) : null), [published]);
  const [text, setText] = useState(EXAMPLE);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [confidence, setConfidence] = useState(1);
  const [compare, setCompare] = useState(false);

  const result = useMemo(() => analyze(text, draftRules, settings, { ocrConfidence: confidence }), [text, draftRules, settings, confidence]);
  const publishedResult = useMemo(
    () => (compare && publishedRules ? analyze(text, publishedRules, settings, { ocrConfidence: confidence }) : null),
    [compare, publishedRules, text, settings, confidence],
  );

  const toggleList = (key: 'disabledCategories' | 'disabledIngredients', id: string) =>
    setSettings((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));

  const flaggable = draft.ingredients.filter((i) => i.tier !== 'neutral' || i.strictTier !== 'neutral');

  return (
    <div className={styles.layout}>
      <section className="card stack">
        <div>
          <label htmlFor="sample">Load a sample</label>
          <select
            id="sample"
            value=""
            onChange={(e) => {
              const s = samples.find((x) => x.name === e.target.value);
              if (!s) return;
              setText(s.text);
              setSettings({ ...DEFAULT_SETTINGS, ...s.settings });
              setConfidence(s.ocrConfidence ?? 1);
            }}
          >
            <option value="">Choose a regression fixture…</option>
            {samples.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} (expects {s.verdict.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="label-text">Label text</label>
          <textarea id="label-text" rows={9} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        </div>
        <div>
          <label htmlFor="confidence">OCR confidence: {confidence.toFixed(2)}</label>
          <input
            id="confidence"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className={styles.range}
          />
        </div>
        <fieldset className={styles.fieldset}>
          <legend>User settings</legend>
          <label className="inline">
            <input type="checkbox" checked={settings.strictMode} onChange={(e) => setSettings({ ...settings, strictMode: e.target.checked })} />
            Strict mode
          </label>
          <label className="inline">
            <input type="checkbox" checked={settings.noGelatin} onChange={(e) => setSettings({ ...settings, noGelatin: e.target.checked })} />
            No gelatin
          </label>
          <details>
            <summary className="small">Ignore categories ({settings.disabledCategories.length})</summary>
            <div className={styles.checks}>
              {draft.categories
                .filter((c) => c.toggleable)
                .map((c) => (
                  <label className="inline" key={c.id}>
                    <input type="checkbox" checked={settings.disabledCategories.includes(c.id)} onChange={() => toggleList('disabledCategories', c.id)} />
                    {c.label}
                  </label>
                ))}
            </div>
          </details>
          <details>
            <summary className="small">Allow ingredients ({settings.disabledIngredients.length})</summary>
            <div className={styles.checks}>
              {flaggable.map((i) => (
                <label className="inline" key={i.id}>
                  <input type="checkbox" checked={settings.disabledIngredients.includes(i.id)} onChange={() => toggleList('disabledIngredients', i.id)} />
                  {i.name}
                </label>
              ))}
            </div>
          </details>
        </fieldset>
        {publishedRules ? (
          <label className="inline">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Compare with published v{published!.version}
          </label>
        ) : (
          <p className="muted small">No published version yet, so there is nothing to compare against.</p>
        )}
      </section>

      <section className="stack" aria-live="polite">
        <VerdictBanner result={result} label={publishedResult ? 'draft' : undefined} />
        {publishedResult ? (
          <>
            <VerdictBanner result={publishedResult} label={`published v${published!.version}`} />
            <p className="small muted">
              {publishedResult.verdict === result.verdict && publishedResult.summary === result.summary
                ? 'Same verdict on draft and published rules.'
                : 'The draft changes this verdict.'}
            </p>
          </>
        ) : null}
        <ResultDetail result={result} />
      </section>
    </div>
  );
}
