'use client';
import { aliasNorm } from '@mindset/rules-engine';
import { useMemo, useState } from 'react';
import { addAliases } from '../actions';

type Kind = 'name' | 'e_number' | 'ocr_misspelling';

/** Bulk alias entry with a live preview of how each line normalises and whether it conflicts. */
export function AliasPaste({ ingredientId, index }: { ingredientId: string; index: Record<string, string> }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('name');

  const preview = useMemo(() => {
    const seen = new Set<string>();
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((alias) => {
        let key = '';
        try {
          key = aliasNorm({ alias, kind });
        } catch {
          return { alias, key: '', status: 'invalid' as const, note: 'not a valid E/INS code' };
        }
        if (!key) return { alias, key, status: 'invalid' as const, note: 'empty after normalising' };
        if (seen.has(key)) return { alias, key, status: 'dup' as const, note: 'repeated in this list' };
        seen.add(key);
        const owner = index[`${kind === 'e_number' ? 'e:' : 'n:'}${key}`];
        if (owner === ingredientId) return { alias, key, status: 'dup' as const, note: 'already an alias here' };
        if (owner) return { alias, key, status: 'conflict' as const, note: `belongs to ${owner}` };
        return { alias, key, status: 'new' as const, note: 'new' };
      });
  }, [text, kind, index, ingredientId]);

  const conflicts = preview.filter((p) => p.status === 'conflict').length;
  const fresh = preview.filter((p) => p.status === 'new').length;

  return (
    <form action={addAliases} className="card stack">
      <input type="hidden" name="ingredient_id" value={ingredientId} />
      <div className="row">
        <div className="grow">
          <label htmlFor="aliases">Add aliases, one per line</label>
          <textarea id="aliases" name="aliases" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Allura Red AC\nFD&C Red No. 40'} />
        </div>
        <div>
          <label htmlFor="kind">Kind</label>
          <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="name">Name</option>
            <option value="e_number">E / INS number</option>
            <option value="ocr_misspelling">OCR misspelling</option>
          </select>
        </div>
      </div>
      {preview.length ? (
        <table>
          <thead>
            <tr>
              <th>Alias</th>
              <th>Matches as</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((p, i) => (
              <tr key={`${p.alias}-${i}`}>
                <td>{p.alias}</td>
                <td className="mono">{p.key || '—'}</td>
                <td>
                  <span className={`pill ${p.status === 'new' ? 'tier-good' : p.status === 'conflict' || p.status === 'invalid' ? 'tier-bad' : 'tier-none'}`}>
                    {p.note}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="row">
        <button className="primary" type="submit" disabled={!fresh}>
          Add {fresh || ''} alias{fresh === 1 ? '' : 'es'}
        </button>
        {conflicts ? <span className="small muted">Conflicting aliases are skipped; move them on the other ingredient first.</span> : null}
      </div>
    </form>
  );
}
