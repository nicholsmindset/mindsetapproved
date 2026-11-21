import Link from 'next/link';
import { DraftRulesProvider } from '@/components/DraftRules';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import { loadDraft, tryCompile } from '@/lib/rules';
import { closeReport } from './actions';
import { Rerun } from './Rerun';

export const dynamic = 'force-dynamic';

const EMPTY = { schema: 1 as const, version: 0, generatedAt: '', categories: [], ingredients: [], aliases: {}, eNumbers: {} };

interface Report {
  id: string;
  reason: string;
  comment: string | null;
  status: string;
  created_at: string;
  scans: { id: string; barcode: string | null; ocr_text: string | null; verdict: string; rules_version: number | null; source: string | null } | null;
}

export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status === 'closed' ? 'closed' : 'open';
  const { supabase } = await requireAdmin();
  let q = supabase
    .from('reports')
    .select('id, reason, comment, status, created_at, scans(id, barcode, ocr_text, verdict, rules_version, source)')
    .order('created_at', { ascending: false })
    .limit(100);
  q = status === 'open' ? q.eq('status', 'open') : q.neq('status', 'open');
  const [{ data, error }, draft] = await Promise.all([q, loadDraft(supabase)]);
  const { bundle } = tryCompile(draft);
  const reports = (data ?? []) as unknown as Report[];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Wrong-verdict reports</h1>
          <p className="muted">Each report carries the scanned text. Re-run it on the draft rules to check a fix before publishing.</p>
        </div>
        <nav className="row" aria-label="Status">
          <Link href="/admin/reports" className={`button ${status === 'open' ? 'primary' : ''}`}>
            Open
          </Link>
          <Link href="/admin/reports?status=closed" className={`button ${status === 'closed' ? 'primary' : ''}`}>
            Closed
          </Link>
        </nav>
      </div>
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      {reports.length === 0 ? <div className="card muted">No {status} reports.</div> : null}
      <DraftRulesProvider bundle={bundle ?? EMPTY}>
      <div className="stack">
        {reports.map((r) => (
          <article key={r.id} className="card stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{r.reason}</strong>
                <div className="muted small">
                  {new Date(r.created_at).toLocaleString('en-SG')} · verdict given: {r.scans?.verdict.replace('_', ' ') ?? '—'} · rules v
                  {r.scans?.rules_version ?? '?'}
                  {r.scans?.barcode ? ` · barcode ${r.scans.barcode}` : ''}
                  {r.scans?.source ? ` · ${r.scans.source}` : ''}
                </div>
              </div>
              {r.status === 'open' ? (
                <div className="row">
                  <form action={closeReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="resolved" />
                    <button type="submit" className="primary">
                      Resolved
                    </button>
                  </form>
                  <form action={closeReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button type="submit">Dismiss</button>
                  </form>
                </div>
              ) : (
                <span className="pill tier-none">{r.status}</span>
              )}
            </div>
            {r.comment ? <p>“{r.comment}”</p> : null}
            {r.scans?.ocr_text ? (
              <>
                <pre className="mono small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {r.scans.ocr_text}
                </pre>
                <Rerun text={r.scans.ocr_text} reportedVerdict={r.scans.verdict} />
              </>
            ) : (
              <p className="muted small">No scanned text was stored with this scan.</p>
            )}
          </article>
        ))}
      </div>
      </DraftRulesProvider>
    </div>
  );
}
