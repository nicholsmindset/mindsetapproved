import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import { loadDraft } from '@/lib/rules';
import { buildSuggestIndex, suggestMatches, type SuggestIndex } from '@/lib/suggest';
import { bulkIgnore, mapTerm, setStatus } from './actions';

export const dynamic = 'force-dynamic';

interface Term {
  term_norm: string;
  count: number;
  first_seen: string;
  last_seen: string;
  example_label: string | null;
  status: 'new' | 'added' | 'ignored';
  mapped_ingredient_id: string | null;
}

const STATUSES = ['new', 'added', 'ignored'] as const;

export default async function Unmatched({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : 'new';
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: ingredients }] = await Promise.all([
    supabase.from('unmatched_terms').select('*').eq('status', status).order('count', { ascending: false }).order('last_seen', { ascending: false }).limit(200),
    supabase.from('ingredients').select('id, display_name').order('display_name'),
  ]);
  const terms = (data ?? []) as Term[];
  let index: SuggestIndex | null = null;
  if (status === 'new' && terms.length) {
    try {
      const draft = await loadDraft(supabase);
      index = buildSuggestIndex(draft.ingredients, draft.aliases);
    } catch {
      index = null; // suggestions are a convenience; the page works without them
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Unmatched terms</h1>
          <p className="muted">Words from real scans that matched no rule, most frequent first. Map them, create an ingredient, or ignore them.</p>
        </div>
        <nav className="row" aria-label="Status">
          {STATUSES.map((s) => (
            <Link key={s} href={`/admin/unmatched?status=${s}`} className={`button ${s === status ? 'primary' : ''}`}>
              {s}
            </Link>
          ))}
        </nav>
      </div>
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      <datalist id="ingredient-options">
        {(ingredients ?? []).map((i: { id: string; display_name: string }) => (
          <option key={i.id} value={`${i.id} — ${i.display_name}`} />
        ))}
      </datalist>

      {terms.length === 0 ? (
        <div className="card muted">Nothing here.</div>
      ) : (
        <div className="table-wrap">
          {status === 'new' ? (
            <form id="bulk" action={bulkIgnore} className="row" style={{ marginBottom: 8 }}>
              <button type="submit">Ignore ticked</button>
              <span className="muted small">Tick junk terms (place names, label noise) and ignore them together.</span>
            </form>
          ) : null}
          <table>
            <thead>
              <tr>
                {status === 'new' ? <th aria-label="Select" /> : null}
                <th>Term</th>
                <th>Seen</th>
                <th>Example label</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.term_norm}>
                  {status === 'new' ? (
                    <td>
                      <input type="checkbox" name="term" value={t.term_norm} form="bulk" aria-label={`Select ${t.term_norm}`} />
                    </td>
                  ) : null}
                  <td>
                    <code>{t.term_norm}</code>
                  </td>
                  <td>
                    {t.count}×<div className="muted small">last {new Date(t.last_seen).toLocaleDateString('en-SG')}</div>
                  </td>
                  <td className="small" style={{ maxWidth: 320 }}>
                    {t.example_label ?? <span className="muted">—</span>}
                  </td>
                  <td style={{ minWidth: 280 }}>
                    {t.status === 'new' ? (
                      <div className="stack">
                        {index ? <Suggestions term={t.term_norm} index={index} /> : null}
                        <form action={mapTerm} className="row">
                          <input type="hidden" name="term" value={t.term_norm} />
                          <div className="grow">
                            <label htmlFor={`map-${t.term_norm}`} className="small">
                              Map to
                            </label>
                            <input id={`map-${t.term_norm}`} name="ingredient_id" type="text" list="ingredient-options" required placeholder="Search ingredients" />
                          </div>
                          <button type="submit">Map</button>
                        </form>
                        <div className="row">
                          <Link className="button" href={`/admin/ingredients?new=${encodeURIComponent(t.term_norm)}#new`}>
                            New ingredient
                          </Link>
                          <form action={setStatus}>
                            <input type="hidden" name="term" value={t.term_norm} />
                            <input type="hidden" name="status" value="ignored" />
                            <button type="submit">Ignore</button>
                          </form>
                        </div>
                      </div>
                    ) : t.status === 'added' ? (
                      <span>
                        Mapped to{' '}
                        {t.mapped_ingredient_id ? <Link href={`/admin/ingredients/${t.mapped_ingredient_id}`}>{t.mapped_ingredient_id}</Link> : '—'}
                      </span>
                    ) : (
                      <form action={setStatus}>
                        <input type="hidden" name="term" value={t.term_norm} />
                        <input type="hidden" name="status" value="new" />
                        <button type="submit">Back to queue</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Suggestions({ term, index }: { term: string; index: SuggestIndex }) {
  const list = suggestMatches(term, index);
  if (list.length === 0) return null;
  return (
    <div className="row" aria-label="Suggested matches">
      <span className="muted small">Suggested:</span>
      {list.map((s) => (
        <form key={s.ingredientId} action={mapTerm}>
          <input type="hidden" name="term" value={term} />
          <input type="hidden" name="ingredient_id" value={s.ingredientId} />
          <button type="submit" title={`Closest name: ${s.alias} (${Math.round(s.score * 100)}%)`}>
            {s.name}
          </button>
        </form>
      ))}
    </div>
  );
}
