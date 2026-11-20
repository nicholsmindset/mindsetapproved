import type { Rules } from './bundle';

/** pg_trgm-style trigrams: each word padded with two leading spaces and one trailing. */
export function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.split(' ')) {
    if (!w) continue;
    const p = `  ${w} `;
    for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  }
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Optimal-string-alignment Damerau-Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

function index(rules: Rules): Map<string, string[]> {
  if (rules._trigrams) return rules._trigrams;
  const idx = new Map<string, string[]>();
  for (const key of rules.aliases.keys()) {
    for (const t of trigrams(key)) {
      const list = idx.get(t);
      if (list) list.push(key);
      else idx.set(t, [key]);
    }
  }
  rules._trigrams = idx;
  return idx;
}

export const FUZZY_MIN_LETTERS = 7;

/**
 * Guards against real-but-different words: same word count, each word keeps its first letter
 * ("sodium citrate" must not become "sodium nitrate"), and numbers must match exactly
 * ("polysorbate 60" must not become "polysorbate 80").
 */
function sameShape(a: string, b: string): boolean {
  const wa = a.split(' ');
  const wb = b.split(' ');
  if (wa.length !== wb.length) return false;
  if (a.replace(/\D/g, '') !== b.replace(/\D/g, '')) return false;
  return wa.every((w, i) => w[0] === wb[i]![0]);
}
export const FUZZY_MIN_SIMILARITY = 0.85;

/**
 * OCR-noise fallback. Only for terms over 6 letters: edit distance <= 2 (<= 1 under 8 letters)
 * or trigram similarity >= 0.85, subject to sameShape(). Ambiguous ties between different ingredients return null.
 */
export function fuzzyLookup(key: string, rules: Rules): { id: string; alias: string } | null {
  const letters = key.replace(/[^a-z]/g, '').length;
  if (letters < FUZZY_MIN_LETTERS) return null;
  const allowed = letters >= 8 ? 2 : 1;
  const idx = index(rules);
  const counts = new Map<string, number>();
  const kt = trigrams(key);
  for (const t of kt) for (const cand of idx.get(t) ?? []) counts.set(cand, (counts.get(cand) ?? 0) + 1);
  const minShared = Math.max(2, Math.floor(kt.size * 0.3));

  let best: { alias: string; id: string; d: number; sim: number } | null = null;
  let tie = false;
  for (const [cand, shared] of counts) {
    if (shared < minShared) continue;
    if (Math.abs(cand.length - key.length) > allowed + 1) continue;
    if (!sameShape(key, cand)) continue;
    const d = editDistance(key, cand);
    const sim = trigramSimilarity(key, cand);
    if (d > allowed && sim < FUZZY_MIN_SIMILARITY) continue;
    const id = rules.aliases.get(cand)!;
    if (!best || d < best.d || (d === best.d && sim > best.sim)) {
      tie = false;
      best = { alias: cand, id, d, sim };
    } else if (d === best.d && sim === best.sim && id !== best.id) {
      tie = true;
    }
  }
  if (!best || tie) return null;
  return { id: best.id, alias: best.alias };
}
