import { hasCJK, normKey, trigramSimilarity, type AliasRow, type IngredientRow } from '@mindset/rules-engine';

export interface Suggestion {
  ingredientId: string;
  name: string;
  /** The alias that scored best. */
  alias: string;
  /** 0–1. */
  score: number;
}

export interface SuggestIndex {
  aliases: { key: string; ingredientId: string }[];
  names: Map<string, string>;
}

const MIN_SCORE = 0.35;

/** Prepares the draft rules once per page, so each term only does the scoring. */
export function buildSuggestIndex(ingredients: Pick<IngredientRow, 'id' | 'display_name'>[], aliases: Pick<AliasRow, 'alias' | 'ingredient_id'>[]): SuggestIndex {
  const seen = new Set<string>();
  const list: SuggestIndex['aliases'] = [];
  for (const a of aliases) {
    const key = normKey(a.alias);
    if (key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    list.push({ key, ingredientId: a.ingredient_id });
  }
  return { aliases: list, names: new Map(ingredients.map((i) => [i.id, i.display_name])) };
}

function score(term: string, alias: string): number {
  if (term === alias) return 1;
  // A known name inside the term ("organic cane sugar syrup" contains "cane sugar"): strong, scaled by how much of the term it covers.
  const contains = hasCJK(alias) ? term.includes(alias) : ` ${term} `.includes(` ${alias} `);
  if (contains && alias.length >= 3) return 0.6 + 0.35 * (alias.length / term.length);
  return trigramSimilarity(term, alias);
}

/**
 * Up to `limit` rules an unmatched term most likely belongs to, best first, one per rule.
 * Advisory only: the admin still chooses, and nothing is mapped automatically.
 */
export function suggestMatches(term: string, index: SuggestIndex, limit = 3): Suggestion[] {
  const key = normKey(term);
  if (!key) return [];
  const best = new Map<string, { alias: string; score: number }>();
  for (const a of index.aliases) {
    const s = score(key, a.key);
    if (s < MIN_SCORE) continue;
    const prev = best.get(a.ingredientId);
    if (!prev || s > prev.score) best.set(a.ingredientId, { alias: a.key, score: s });
  }
  return [...best.entries()]
    .sort((x, y) => y[1].score - x[1].score || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([id, v]) => ({ ingredientId: id, name: index.names.get(id) ?? id, alias: v.alias, score: Math.round(v.score * 100) / 100 }));
}
