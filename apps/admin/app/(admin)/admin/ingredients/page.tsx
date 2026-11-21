import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { TierPill } from '@/components/TierPill';
import { requireAdmin } from '@/lib/auth';
import { TIERS, type CategoryRow, type IngredientRow } from '@/lib/types';
import { createIngredient } from './actions';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

export default async function Ingredients({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order');

  let query = supabase
    .from('ingredients')
    .select('id, display_name, category, tier, strict_tier, is_active, updated_at, aliases(count)')
    .order('is_active', { ascending: false })
    .order('display_name')
    .limit(500);
  if (sp.q) query = query.or(`display_name.ilike.%${sp.q.replace(/[%,()]/g, '')}%,id.ilike.%${sp.q.replace(/[%,()]/g, '')}%`);
  if (sp.category) query = query.eq('category', sp.category);
  if (sp.tier === 'untiered') query = query.is('tier', null);
  else if (sp.tier) query = query.eq('tier', sp.tier);
  if (sp.active === 'yes') query = query.eq('is_active', true);
  if (sp.active === 'no') query = query.eq('is_active', false);
  const { data, error } = await query;
  const rows = (data ?? []) as Array<Pick<IngredientRow, 'id' | 'display_name' | 'category' | 'tier' | 'strict_tier' | 'is_active'> & { aliases: Array<{ count: number }> }>;
  const cats = (categories ?? []) as CategoryRow[];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Ingredients</h1>
          <p className="muted">{rows.length} shown. Deactivate instead of deleting; edits ship with the next publish.</p>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />

      <form className="row card" style={{ marginBottom: 16 }}>
        <div className="grow">
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={sp.q} placeholder="Name or id" />
        </div>
        <div>
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={sp.category ?? ''}>
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tier">Tier</label>
          <select id="tier" name="tier" defaultValue={sp.tier ?? ''}>
            <option value="">All</option>
            {TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option value="untiered">untiered</option>
          </select>
        </div>
        <div>
          <label htmlFor="active">Status</label>
          <select id="active" name="active" defaultValue={sp.active ?? ''}>
            <option value="">All</option>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        </div>
        <button type="submit">Filter</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Category</th>
              <th>Tier</th>
              <th>Strict</th>
              <th>Aliases</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/ingredients/${r.id}`}>{r.display_name}</Link>
                  <div className="mono muted small">{r.id}</div>
                </td>
                <td>{cats.find((c) => c.id === r.category)?.label ?? r.category}</td>
                <td>
                  <TierPill tier={r.tier} />
                </td>
                <td>
                  <TierPill tier={r.strict_tier} />
                </td>
                <td>{r.aliases[0]?.count ?? 0}</td>
                <td>{r.is_active ? 'Active' : <span className="muted">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="new">New ingredient</h2>
      <form action={createIngredient} className="card row">
        <div className="grow">
          <label htmlFor="display_name">Display name</label>
          <input id="display_name" name="display_name" type="text" required defaultValue={sp.new ?? ''} placeholder="Ponceau 4R" />
        </div>
        <div>
          <label htmlFor="new_category">Category</label>
          <select id="new_category" name="category" defaultValue="unreviewed">
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {sp.new ? <input type="hidden" name="map_term" value={sp.new} /> : null}
        <button className="primary" type="submit">
          Create (inactive)
        </button>
      </form>
    </div>
  );
}
