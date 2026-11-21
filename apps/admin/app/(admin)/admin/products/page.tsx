import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Product {
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
  let q = supabase.from('products').select('barcode, name, brand, source, verified, is_active, updated_at').order('updated_at', { ascending: false }).limit(200);
  const term = sp.q?.replace(/[%,()]/g, '').trim();
  if (term) q = /^\d+$/.test(term) ? q.like('barcode', `${term}%`) : q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  if (sp.verified === 'no') q = q.eq('verified', false);
  const { data, error } = await q;
  const rows = (data ?? []) as Product[];

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
                  {p.verified ? <span className="pill tier-good">verified</span> : <span className="pill tier-none">unverified</span>}{' '}
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
