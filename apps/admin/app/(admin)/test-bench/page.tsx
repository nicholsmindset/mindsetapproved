import fixtures from '@mindset/rules-engine/fixtures/labels.json';
import type { LabelFixture, RulesBundle } from '@mindset/rules-engine';
import { requireAdmin } from '@/lib/auth';
import { hasSupabase } from '@/lib/env';
import { fetchBundle, latestVersion, loadDraft, starterDraft, tryCompile } from '@/lib/rules';
import { TestBench } from './TestBench';

export const dynamic = 'force-dynamic';

export default async function TestBenchPage() {
  let draft = starterDraft();
  let published: RulesBundle | null = null;
  let loadError: string | null = null;

  if (hasSupabase) {
    const { supabase } = await requireAdmin();
    try {
      draft = await loadDraft(supabase);
      const latest = await latestVersion(supabase);
      if (latest) published = await fetchBundle(latest.bundle_url);
    } catch (e) {
      loadError = (e as Error).message;
    }
  }
  const { bundle, problems } = tryCompile(draft, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Test bench</h1>
          <p className="muted">
            Paste any ingredient list and see the verdict exactly as the app computes it.{' '}
            {hasSupabase ? 'Draft = the live tables, before publishing.' : 'Offline mode: using data/starter-rules.json.'}
          </p>
        </div>
      </div>
      {loadError ? <div className="flash error">{loadError}</div> : null}
      {problems.length ? (
        <div className="flash error">
          The draft rules don&apos;t compile, so the app would reject them:
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {bundle ? <TestBench draft={bundle} published={published} samples={fixtures as LabelFixture[]} /> : null}
    </div>
  );
}
