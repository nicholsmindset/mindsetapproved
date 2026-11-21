import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import { TIERS, type AliasRow, type CategoryRow, type IngredientRow } from '@/lib/types';
import { deleteAlias, updateIngredient } from '../actions';
import { AliasPaste } from './AliasPaste';

export const dynamic = 'force-dynamic';

export default async function IngredientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: ing }, { data: aliases }, { data: categories }, { data: allAliases }] = await Promise.all([
    supabase.from('ingredients').select('*').eq('id', id).maybeSingle(),
    supabase.from('aliases').select('*').eq('ingredient_id', id).order('kind').order('alias'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('aliases').select('alias_norm, ingredient_id, kind').range(0, 99_999),
  ]);
  if (!ing) notFound();
  const row = ing as IngredientRow;
  const cats = (categories ?? []) as CategoryRow[];
  const index: Record<string, string> = {};
  for (const a of (allAliases ?? []) as Array<Pick<AliasRow, 'alias_norm' | 'ingredient_id' | 'kind'>>) {
    index[`${a.kind === 'e_number' ? 'e:' : 'n:'}${a.alias_norm}`] = a.ingredient_id;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="small">
            <Link href="/admin/ingredients">← Ingredients</Link>
          </p>
          <h1>{row.display_name}</h1>
          <p className="mono muted small">
            {row.id}
            {row.off_tag ? ` · OFF ${row.off_tag}` : ''}
          </p>
        </div>
        <Link className="button" href={`/admin/test-bench`}>
          Try in test bench
        </Link>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <form action={updateIngredient} className="card stack">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid2">
          <div>
            <label htmlFor="display_name">Display name</label>
            <input id="display_name" name="display_name" type="text" required defaultValue={row.display_name} />
          </div>
          <div>
            <label htmlFor="short_name">Short name (used in “contains …”)</label>
            <input id="short_name" name="short_name" type="text" defaultValue={row.short_name ?? ''} />
          </div>
        </div>
        <div className="row">
          <div className="grow">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={row.category}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label htmlFor="tier">Tier</label>
            <select id="tier" name="tier" defaultValue={row.tier ?? ''}>
              <option value="">untiered</option>
              {TIERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label htmlFor="strict_tier">Strict-mode tier</label>
            <select id="strict_tier" name="strict_tier" defaultValue={row.strict_tier ?? ''}>
              <option value="">untiered</option>
              {TIERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="reason_short">Short reason (one or two neutral sentences, shown on the chip)</label>
          <textarea id="reason_short" name="reason_short" rows={2} defaultValue={row.reason_short} style={{ fontFamily: 'var(--font)' }} />
        </div>
        <div>
          <label htmlFor="reason_long">Longer explanation (optional)</label>
          <textarea id="reason_long" name="reason_long" rows={3} defaultValue={row.reason_long ?? ''} style={{ fontFamily: 'var(--font)' }} />
        </div>
        <div>
          <label htmlFor="learn_more_url">“Learn more” link (optional)</label>
          <input id="learn_more_url" name="learn_more_url" type="url" defaultValue={row.learn_more_url ?? ''} />
        </div>
        <div className="grid2">
          <div>
            <label htmlFor="sources_regulator">Regulator sources, one per line (facts)</label>
            <textarea id="sources_regulator" name="sources_regulator" rows={3} defaultValue={(row.sources?.regulator ?? []).join('\n')} />
          </div>
          <div>
            <label htmlFor="sources_preference">Preference sources, one per line (opinion)</label>
            <textarea id="sources_preference" name="sources_preference" rows={3} defaultValue={(row.sources?.preference ?? []).join('\n')} />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="inline">
            <input type="checkbox" name="is_active" defaultChecked={row.is_active} /> Active (shipped in the next bundle)
          </label>
          <button className="primary" type="submit">
            Save
          </button>
        </div>
      </form>

      <h2>Aliases ({(aliases ?? []).length})</h2>
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Alias</th>
              <th>Matches as</th>
              <th>Kind</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {((aliases ?? []) as AliasRow[]).map((a) => (
              <tr key={a.id}>
                <td>{a.alias}</td>
                <td className="mono">{a.alias_norm}</td>
                <td>{a.kind.replace('_', ' ')}</td>
                <td style={{ textAlign: 'right' }}>
                  <form action={deleteAlias}>
                    <input type="hidden" name="ingredient_id" value={row.id} />
                    <input type="hidden" name="alias_id" value={a.id} />
                    <button type="submit" className="danger" aria-label={`Remove alias ${a.alias}`}>
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AliasPaste ingredientId={row.id} index={index} />
    </div>
  );
}
