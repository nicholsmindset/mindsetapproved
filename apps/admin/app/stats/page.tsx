import { Flash } from '@/components/Flash';
import { requireAdmin } from '@/lib/auth';
import styles from './stats.module.css';

export const dynamic = 'force-dynamic';

interface Stats {
  days: number;
  scans_total: number;
  scans_per_day: Array<{ day: string; count: number }>;
  verdict_mix: Record<string, number>;
  source_mix: Record<string, number>;
  top_flagged: Array<{ ingredient_id: string; count: number }>;
  unmatched_new: number;
  reports_open: number;
  reports_total: number;
  products: number;
  latest_version: number | null;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const VERDICTS = [
  ['approved', 'Approved'],
  ['caution', 'Caution'],
  ['not_approved', 'Not Approved'],
  ['cant_verify', "Can't verify"],
] as const;

/** Single-series horizontal bars: one hue, value printed in text ink beside each bar, table semantics underneath. */
function BarList({ rows, label }: { rows: Array<{ key: string; label: string; value: number }>; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <table className={styles.bars} aria-label={label}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} title={`${r.label}: ${r.value}`}>
            <th scope="row">{r.label}</th>
            <td className={styles.barCell}>
              <span className={styles.bar} style={{ width: `${(r.value / max) * 100}%` }} />
            </td>
            <td className={styles.value}>{r.value.toLocaleString('en-SG')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: names }] = await Promise.all([
    supabase.rpc('admin_stats', { p_days: days }),
    supabase.from('ingredients').select('id, display_name'),
  ]);
  const s = data as Stats | null;
  const nameOf = new Map(((names ?? []) as Array<{ id: string; display_name: string }>).map((n) => [n.id, n.display_name]));
  const sources = s?.source_mix ?? {};
  const barcodeScans = (sources['cache'] ?? 0) + (sources['off'] ?? 0);
  const labelScans = (sources['label'] ?? 0) + (sources['ai'] ?? 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Stats</h1>
          <p className="muted">Last {days} days.</p>
        </div>
        <form className="row">
          <select name="days" defaultValue={String(days)} aria-label="Time range" style={{ width: 'auto' }}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
          <button type="submit">Apply</button>
        </form>
      </div>
      <Flash error={error?.message} />
      {s ? (
        <div className="stack">
          <div className={styles.tiles}>
            <div className="card">
              <div className={styles.tileLabel}>Scans</div>
              <div className={styles.tileValue}>{s.scans_total.toLocaleString('en-SG')}</div>
            </div>
            <div className="card">
              <div className={styles.tileLabel}>Cache hit rate (barcode)</div>
              <div className={styles.tileValue}>{pct(sources['cache'] ?? 0, barcodeScans)}</div>
            </div>
            <div className="card">
              <div className={styles.tileLabel}>AI re-check rate (label)</div>
              <div className={styles.tileValue}>{pct(sources['ai'] ?? 0, labelScans)}</div>
            </div>
            <div className="card">
              <div className={styles.tileLabel}>Wrong-verdict reports</div>
              <div className={styles.tileValue}>{pct(s.reports_total, s.scans_total)}</div>
              <div className="muted small">{s.reports_open} open · target under 2%</div>
            </div>
            <div className="card">
              <div className={styles.tileLabel}>Unmatched terms waiting</div>
              <div className={styles.tileValue}>{s.unmatched_new}</div>
            </div>
            <div className="card">
              <div className={styles.tileLabel}>Rules version live</div>
              <div className={styles.tileValue}>{s.latest_version ? `v${s.latest_version}` : '—'}</div>
              <div className="muted small">{s.products} cached products</div>
            </div>
          </div>
          <div className="grid2">
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Verdict mix</h2>
              <BarList
                label="Scans by verdict"
                rows={VERDICTS.map(([k, l]) => ({ key: k, label: l, value: s.verdict_mix[k] ?? 0 }))}
              />
            </section>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Top flagged ingredients</h2>
              {s.top_flagged.length ? (
                <BarList
                  label="Most flagged ingredients"
                  rows={s.top_flagged.map((t) => ({ key: t.ingredient_id, label: nameOf.get(t.ingredient_id) ?? t.ingredient_id, value: t.count }))}
                />
              ) : (
                <p className="muted">No flagged scans yet.</p>
              )}
            </section>
          </div>
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Scans per day</h2>
            {s.scans_per_day.length ? (
              <BarList label="Scans per day" rows={s.scans_per_day.map((d) => ({ key: d.day, label: d.day, value: d.count }))} />
            ) : (
              <p className="muted">No scans in this range.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
