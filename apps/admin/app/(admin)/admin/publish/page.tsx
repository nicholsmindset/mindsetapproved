import fixtures from '@mindset/rules-engine/fixtures/labels.json';
import { preparePublish, type BundleDiff, type LabelFixture, type PublishPlan, type RulesBundle } from '@mindset/rules-engine';
import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { TierPill } from '@/components/TierPill';
import { requireAdmin } from '@/lib/auth';
import { fetchBundle, loadDraft, type RuleVersion } from '@/lib/rules';
import { publish } from './actions';

export const dynamic = 'force-dynamic';

function DiffView({ diff }: { diff: BundleDiff }) {
  if (diff.isEmpty) return <p className="muted">No changes since the last published version.</p>;
  const fmt = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : String(v));
  return (
    <div className="stack">
      {diff.changedIngredients.length ? (
        <section>
          <h3>Changed ({diff.changedIngredients.length})</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {diff.changedIngredients.flatMap((c) =>
                  c.fields.map((f, i) => (
                    <tr key={`${c.id}-${f.field}`}>
                      <td>{i === 0 ? <Link href={`/admin/ingredients/${c.id}`}>{c.name}</Link> : null}</td>
                      <td className="muted">{f.field}</td>
                      <td>
                        {f.field === 'tier' || f.field === 'strictTier' ? (
                          <>
                            <TierPill tier={f.from as never} /> → <TierPill tier={f.to as never} />
                          </>
                        ) : (
                          <>
                            <span className="muted">{fmt(f.from)}</span> → {fmt(f.to)}
                          </>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {diff.addedIngredients.length ? (
        <section>
          <h3>Added ingredients ({diff.addedIngredients.length})</h3>
          <p className="small">
            {diff.addedIngredients.map((i, n) => (
              <span key={i.id}>
                {n ? ', ' : ''}
                <Link href={`/admin/ingredients/${i.id}`}>{i.name}</Link> <TierPill tier={i.tier} />
              </span>
            ))}
          </p>
        </section>
      ) : null}
      {diff.removedIngredients.length ? (
        <section>
          <h3>Removed ingredients ({diff.removedIngredients.length})</h3>
          <p className="small">{diff.removedIngredients.map((i) => i.name).join(', ')}</p>
        </section>
      ) : null}
      {diff.addedAliases.length || diff.removedAliases.length || diff.movedAliases.length ? (
        <section>
          <h3>
            Aliases: +{diff.addedAliases.length} / −{diff.removedAliases.length} / moved {diff.movedAliases.length}
          </h3>
          <details>
            <summary className="small">Show alias changes</summary>
            <ul className="small mono">
              {diff.movedAliases.map((a) => (
                <li key={`m-${a.key}`}>
                  ~ {a.key}: {a.from} → {a.to}
                </li>
              ))}
              {diff.addedAliases.slice(0, 500).map((a) => (
                <li key={`a-${a.key}`}>
                  + {a.key} → {a.ingredientId}
                </li>
              ))}
              {diff.removedAliases.map((a) => (
                <li key={`r-${a.key}`}>
                  − {a.key} ({a.ingredientId})
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}
    </div>
  );
}

export default async function Publish({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: versions } = await supabase.from('rule_versions').select('*').order('version', { ascending: false }).limit(20);
  const history = (versions ?? []) as RuleVersion[];
  const latest = history[0] ?? null;

  let plan: PublishPlan | null = null;
  let problem: string | null = null;
  try {
    const draft = await loadDraft(supabase);
    const previous: RulesBundle | null = latest ? await fetchBundle(latest.bundle_url) : null;
    plan = preparePublish({ draft, previous, fixtures: fixtures as LabelFixture[] });
  } catch (e) {
    const problems = (e as { problems?: string[] }).problems;
    problem = problems ? `The draft rules don't compile:\n${problems.join('\n')}` : (e as Error).message;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Publish rules</h1>
          <p className="muted">
            {latest ? `Phones are on v${latest.version} (published ${new Date(latest.published_at).toLocaleString('en-SG')}).` : 'Nothing has been published yet.'}{' '}
            Publishing compiles the draft, runs {fixtures.length} regression labels, uploads the bundle and phones download it on their next open.
          </p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      {problem ? (
        <div className="flash error" style={{ whiteSpace: 'pre-wrap' }}>
          {problem}
        </div>
      ) : null}

      {plan ? (
        <div className="stack">
          <section className="card">
            <h2 style={{ marginTop: 0 }}>
              Draft v{plan.bundle.version}: {plan.bundle.ingredients.length} ingredients,{' '}
              {Object.keys(plan.bundle.aliases).length + Object.keys(plan.bundle.eNumbers).length} aliases
            </h2>
            <DiffView diff={plan.diff} />
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>
              Regression labels: {plan.results.length - plan.failures.length}/{plan.results.length} pass
            </h2>
            {plan.failures.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Now gives</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.failures.map((f) => (
                      <tr key={f.name}>
                        <td>{f.name}</td>
                        <td className="small">{f.summary}</td>
                        <td className="small">{f.problems.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Every regression label still gives its expected verdict.</p>
            )}
          </section>

          <form action={publish} className="card stack">
            <div>
              <label htmlFor="notes">Release notes (optional)</label>
              <input id="notes" name="notes" type="text" placeholder="Added Ponceau 4R; E471 mapped" />
            </div>
            {plan.failures.length ? (
              <label className="inline">
                <input type="checkbox" name="accept" /> These verdict changes are intended. Update the fixtures in
                packages/rules-engine/test/fixtures/labels.json afterwards.
              </label>
            ) : null}
            <div>
              <button className="primary" type="submit" disabled={plan.diff.isEmpty}>
                Publish v{plan.bundle.version}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <h2>History</h2>
      {history.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Published</th>
                <th>Size</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((v) => (
                <tr key={v.version}>
                  <td>
                    <a href={v.bundle_url}>v{v.version}</a>
                  </td>
                  <td>{new Date(v.published_at).toLocaleString('en-SG')}</td>
                  <td>
                    {v.ingredient_count} ingredients, {v.alias_count} aliases
                  </td>
                  <td>{v.notes ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No versions yet.</p>
      )}
    </div>
  );
}
