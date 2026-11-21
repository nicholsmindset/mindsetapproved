import { analyze } from '@mindset/rules-engine';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/Flash';
import { VerdictBanner } from '@/components/Result';
import { requireAdmin } from '@/lib/auth';
import { loadDraft, tryCompile } from '@/lib/rules';
import { saveProduct } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ barcode: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { barcode } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data }, draft] = await Promise.all([supabase.from('products').select('*').eq('barcode', barcode).maybeSingle(), loadDraft(supabase)]);
  if (!data) notFound();
  const p = data as { barcode: string; name: string | null; brand: string | null; ingredients_raw: string; source: string; verified: boolean; is_active: boolean };
  const { bundle } = tryCompile(draft);
  const result = bundle ? analyze(p.ingredients_raw, bundle) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="small">
            <Link href="/admin/products">← Products</Link>
          </p>
          <h1>{p.name ?? 'Unnamed product'}</h1>
          <p className="mono muted small">
            {p.barcode} · source {p.source}
          </p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid2">
        <form action={saveProduct} className="card stack">
          <input type="hidden" name="barcode" value={p.barcode} />
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" defaultValue={p.name ?? ''} />
          </div>
          <div>
            <label htmlFor="brand">Brand</label>
            <input id="brand" name="brand" type="text" defaultValue={p.brand ?? ''} />
          </div>
          <div>
            <label htmlFor="ingredients_raw">Ingredients text</label>
            <textarea id="ingredients_raw" name="ingredients_raw" rows={8} defaultValue={p.ingredients_raw} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <label className="inline">
                <input type="checkbox" name="verified" defaultChecked={p.verified} /> Verified
              </label>
              <label className="inline">
                <input type="checkbox" name="is_active" defaultChecked={p.is_active} /> Visible to the app
              </label>
            </div>
            <button className="primary" type="submit">
              Save
            </button>
          </div>
        </form>
        <div className="stack">
          <h2 style={{ marginTop: 0 }}>Verdict on draft rules</h2>
          {result ? <VerdictBanner result={result} /> : <div className="flash error">The draft rules don&apos;t compile.</div>}
          {result?.unmatched.length ? <p className="small muted">Unmatched: {result.unmatched.join(', ')}</p> : null}
        </div>
      </div>
    </div>
  );
}
