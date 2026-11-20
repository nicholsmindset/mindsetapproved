import type { BundleIngredient, RulesBundle } from './types';

export interface IngredientChange {
  id: string;
  name: string;
  fields: Array<{ field: keyof BundleIngredient; from: unknown; to: unknown }>;
}

export interface BundleDiff {
  addedIngredients: BundleIngredient[];
  removedIngredients: BundleIngredient[];
  changedIngredients: IngredientChange[];
  /** alias/code -> ingredient id */
  addedAliases: Array<{ key: string; ingredientId: string }>;
  removedAliases: Array<{ key: string; ingredientId: string }>;
  /** alias/code that now points at a different ingredient */
  movedAliases: Array<{ key: string; from: string; to: string }>;
  isEmpty: boolean;
}

const FIELDS: Array<keyof BundleIngredient> = ['name', 'shortName', 'category', 'tier', 'strictTier', 'reason', 'learnMoreUrl'];

/** What changes between the last published bundle and a draft (null prev = first publish). */
export function diffBundles(prev: RulesBundle | null, next: RulesBundle): BundleDiff {
  const before = new Map((prev?.ingredients ?? []).map((i) => [i.id, i]));
  const after = new Map(next.ingredients.map((i) => [i.id, i]));
  const d: BundleDiff = {
    addedIngredients: [],
    removedIngredients: [],
    changedIngredients: [],
    addedAliases: [],
    removedAliases: [],
    movedAliases: [],
    isEmpty: true,
  };
  for (const [id, n] of after) {
    const p = before.get(id);
    if (!p) {
      d.addedIngredients.push(n);
      continue;
    }
    const fields = FIELDS.filter((f) => (p[f] ?? null) !== (n[f] ?? null)).map((f) => ({ field: f, from: p[f], to: n[f] }));
    if (fields.length) d.changedIngredients.push({ id, name: n.name, fields });
  }
  for (const [id, p] of before) if (!after.has(id)) d.removedIngredients.push(p);

  const keys = (b: RulesBundle | null) => new Map(Object.entries({ ...(b?.aliases ?? {}), ...(b?.eNumbers ?? {}) }));
  const a0 = keys(prev);
  const a1 = keys(next);
  for (const [k, id] of a1) {
    const old = a0.get(k);
    if (old === undefined) d.addedAliases.push({ key: k, ingredientId: id });
    else if (old !== id) d.movedAliases.push({ key: k, from: old, to: id });
  }
  for (const [k, id] of a0) if (!a1.has(k)) d.removedAliases.push({ key: k, ingredientId: id });

  d.isEmpty =
    !d.addedIngredients.length &&
    !d.removedIngredients.length &&
    !d.changedIngredients.length &&
    !d.addedAliases.length &&
    !d.removedAliases.length &&
    !d.movedAliases.length;
  return d;
}
