import Link from 'next/link';
import { analyze, loadRules } from '@mindset/rules-engine';
import { VerdictBadge } from '@/components/VerdictBadge';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import { loadDraft, tryCompile } from '@/lib/rules';
import { reviewSubmission } from './actions';

export const dynamic = 'force-dynamic';

interface Submission {
  id: string;
  barcode: string;
  ingredients_raw: string;
  text_norm: string;
  name: string | null;
  brand: string | null;
  created_at: string;
}

interface Product {
  corroborated: boolean;
  barcode: string;
  name: string | null;
  brand: string | null;
  source: string;
  verified: boolean;
  is_active: boolean;
  updated_at: string;
}

export default async function Products({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase.from('products').select('barcode, name, brand, source, verified, corroborated, is_active, updated_at').order('updated_at', { ascending: false }).limit(200);
  const term = sp.q?.replace(/[%,()]/g, '').trim();
  if (term) q = /^\d+$/.test(term) ? q.like('barcode', `${term}%`) : q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  if (sp.verified === 'no') q = q.eq('verified', false);
  const [{ data, error }, { data: subs }, draft] = await Promise.all([
    q,
    supabase.from('product_submissions').select('id, barcode, ingredients_raw, text_norm, name, brand, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(100),
    loadDraft(supabase),
  ]);
  const rows = (data ?? []) as Product[];
  const pending = (subs ?? []) as Submission[];
  const { bundle } = tryCompile(draft);
  const rules = bundle ? loadRules(bundle) : null;
  const agreeing = (s: Submission) => pending.filter((o) => o.barcode === s.barcode && o.text_norm === s.text_norm).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Products cache</h1>
          <p className="muted">Barcodes whose ingredient text is saved, so repeat scans skip Open Food Facts. Correct and verify them here.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      <form className="row card" style={{ marginBottom: 16 }}>
        <div className="grow">
          <label htmlFor="q">Barcode, name or brand</label>
          <input id="q" name="q" type="search" defaultValue={sp.q} />
        </div>
        <label className="inline">
          <input type="checkbox" name="verified" value="no" defaultChecked={sp.verified === 'no'} /> Unverified only
        </label>
        <button type="submit">Search</button>
      </form>
      <h2>Pending submissions ({pending.length})</h2>
      <p className="muted small">
        Label text photographed by users for barcodes no database knew. It’s served to everyone only after two different phones
        submit the same text, or you accept it here.
      </p>
      {pending.length ? (
        <div className="stack" style={{ marginBottom: 24 }}>
          {pending.map((s) => (
            <article key={s.id} className="card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong className="mono">{s.barcode}</strong> {s.name ? `· ${s.name}` : ''}
                  <div className="muted small">
                    {new Date(s.created_at).toLocaleString('en-SG')} · {agreeing(s)} matching submission{agreeing(s) === 1 ? '' : 's'}
                  </div>
                </div>
                {rules ? <VerdictBadge verdict={analyze(s.ingredients_raw, rules).verdict} /> : null}
              </div>
              <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {s.ingredients_raw}
              </p>
              <form action={reviewSubmission} className="row">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" name="decision" value="accept" className="primary">
                  Accept as product text
                </button>
                <button type="submit" name="decision" value="reject">
                  Reject
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No pending submissions.</p>
      )}

      <h2>Products</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Product</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.barcode}>
                <td className="mono">
                  <Link href={`/admin/products/${p.barcode}`}>{p.barcode}</Link>
                </td>
                <td>
                  {p.name ?? <span className="muted">Unnamed</span>}
                  {p.brand ? <div className="muted small">{p.brand}</div> : null}
                </td>
                <td>{p.source}</td>
                <td>
                  {p.verified ? (
                    <span className="pill tier-good">verified</span>
                  ) : p.corroborated ? (
                    <span className="pill tier-borderline">2+ phones agree</span>
                  ) : (
                    <span className="pill tier-none">unverified</span>
                  )}{' '}
                  {p.is_active ? null : <span className="pill tier-bad">hidden</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">No products match.</p> : null}
    </div>
  );
}
