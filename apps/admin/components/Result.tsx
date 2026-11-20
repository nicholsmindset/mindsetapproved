'use client';
import type { AnalyzeResult, Chip, Verdict } from '@mindset/rules-engine';
import styles from './Result.module.css';

const VERDICT_LABEL: Record<Verdict, string> = {
  approved: 'Approved',
  caution: 'Caution',
  not_approved: 'Not Approved',
  cant_verify: "Can't verify",
};

export function VerdictBanner({ result, label }: { result: AnalyzeResult; label?: string }) {
  return (
    <div className={`${styles.banner} ${styles[result.verdict]}`} data-testid="verdict" data-verdict={result.verdict}>
      {label ? <div className={styles.ruleset}>{label}</div> : null}
      <div className={styles.summary} data-testid="summary" aria-label={VERDICT_LABEL[result.verdict]}>
        {result.summary}
      </div>
    </div>
  );
}

function ChipView({ chip }: { chip: Chip }) {
  const changed = chip.tier !== chip.baseTier;
  return (
    <li className={`${styles.chip} ${styles[`chip_${chip.tier}`]}`}>
      <div className={styles.chipHead}>
        <strong>{chip.name}</strong>
        <span className={`pill tier-${chip.tier}`}>{chip.tier}</span>
        {changed ? <span className="pill tier-none">was {chip.baseTier}</span> : null}
        {chip.possible ? <span className="pill tier-none">possible match</span> : null}
        {chip.flags.map((f) => (
          <span key={f} className="pill tier-none">
            {f.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      {chip.reason ? <p className={styles.reason}>{chip.reason}</p> : null}
      <p className="muted small">
        Label: “{chip.labelText}” · position {chip.position}
      </p>
    </li>
  );
}

export function ResultDetail({ result }: { result: AnalyzeResult }) {
  return (
    <div className="stack">
      {result.flagged.length ? (
        <section>
          <h3>Flagged ({result.flagged.length})</h3>
          <ul className={styles.chips}>
            {result.flagged.map((c) => (
              <ChipView key={c.ingredientId} chip={c} />
            ))}
          </ul>
        </section>
      ) : null}
      {result.good.length ? (
        <section>
          <h3>Good signs ({result.good.length})</h3>
          <ul className={styles.chips}>
            {result.good.map((c) => (
              <ChipView key={c.ingredientId} chip={c} />
            ))}
          </ul>
        </section>
      ) : null}
      <section className={styles.meta}>
        <div>
          <h3>Unmatched ({result.unmatched.length})</h3>
          {result.unmatched.length ? (
            <ul className={styles.words}>
              {result.unmatched.map((u) => (
                <li key={u}>
                  <code>{u}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Every item matched a rule.</p>
          )}
        </div>
        <div>
          <h3>Neutral ({result.neutral.length})</h3>
          <p className="small">{result.neutral.map((c) => c.shortName).join(', ') || '—'}</p>
        </div>
        <div>
          <h3>Notes</h3>
          <p className="small">{result.notes.join('; ') || '—'}</p>
          <p className="muted small">
            Header found: {result.headerFound ? 'yes' : 'no'} · Suggest AI re-check: {result.suggestAiRecheck ? 'yes' : 'no'}
          </p>
        </div>
      </section>
      <details>
        <summary>Parsed ingredients ({result.items.length})</summary>
        <ol className={styles.tree}>
          {result.items.map((it) => (
            <li key={it.position} style={{ paddingLeft: it.depth * 20 }}>
              <span className="mono muted">{it.position}</span> {it.text || <em>(group)</em>}{' '}
              {it.matches.map((m) => (
                <span key={m.ingredientId} className="pill tier-none">
                  {m.ingredientId} · {m.kind}
                  {m.possible ? '?' : ''}
                </span>
              ))}
              {it.unmatched ? <span className="pill tier-borderline">unmatched</span> : null}
              {it.container ? <span className="muted small"> group</span> : null}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
