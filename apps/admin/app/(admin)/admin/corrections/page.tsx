import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import { closeCorrection } from './actions';

export const dynamic = 'force-dynamic';

interface Correction {
  id: string;
  kind: 'manufacturer' | 'shopper';
  product: string;
  barcode: string | null;
  message: string;
  contact_email: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export default async function Corrections({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const open = sp.status !== 'closed';
  const { supabase } = await requireAdmin();
  let q = supabase.from('corrections').select('*').order('created_at', { ascending: false }).limit(100);
  q = open ? q.eq('status', 'new') : q.neq('status', 'new');
  const { data, error } = await q;
  const rows = (data ?? []) as Correction[];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Corrections</h1>
          <p className="muted">Sent from the public corrections page. Manufacturer messages are marked; reply by email where given.</p>
        </div>
        <nav className="row" aria-label="Status">
          <Link href="/admin/corrections" className={`button ${open ? 'primary' : ''}`}>
            New
          </Link>
          <Link href="/admin/corrections?status=closed" className={`button ${open ? '' : 'primary'}`}>
            Closed
          </Link>
        </nav>
      </div>
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      {rows.length === 0 ? <div className="card muted">Nothing here.</div> : null}
      <div className="stack">
        {rows.map((c) => (
          <article key={c.id} className="card stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{c.product}</strong> {c.kind === 'manufacturer' ? <span className="pill tier-borderline">manufacturer</span> : null}
                <div className="muted small">
                  {new Date(c.created_at).toLocaleString('en-SG')}
                  {c.barcode ? (
                    <>
                      {' · '}
                      <Link href={`/admin/products/${c.barcode}`}>{c.barcode}</Link>
                    </>
                  ) : null}
                  {c.contact_email ? ` · ${c.contact_email}` : ''}
                </div>
              </div>
              {c.status !== 'new' ? <span className="pill tier-none">{c.status.replace('_', ' ')}</span> : null}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{c.message}</p>
            {c.status === 'new' ? (
              <form action={closeCorrection} className="row">
                <input type="hidden" name="id" value={c.id} />
                <div className="grow">
                  <label htmlFor={`note-${c.id}`}>Note (optional)</label>
                  <input id={`note-${c.id}`} name="note" type="text" />
                </div>
                <button type="submit" name="status" value="fixed" className="primary">
                  Fixed
                </button>
                <button type="submit" name="status" value="no_change">
                  No change needed
                </button>
              </form>
            ) : c.admin_note ? (
              <p className="muted small">Note: {c.admin_note}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
