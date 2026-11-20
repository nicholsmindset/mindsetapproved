import { normKey } from './normalize';
import type { BundleIngredient, Category, RulesBundle, Tier } from './types';

export type AliasKind = 'name' | 'e_number' | 'ocr_misspelling';

/** Mirrors the `ingredients` table. */
export interface IngredientRow {
  id: string;
  display_name: string;
  short_name?: string | null;
  category: string;
  tier: Tier;
  strict_tier: Tier;
  reason_short: string;
  learn_more_url?: string | null;
  is_active?: boolean;
}

/** Mirrors the `aliases` table (alias text; alias_norm is derived with normKey / eCode). */
export interface AliasRow {
  alias: string;
  ingredient_id: string;
  kind: AliasKind;
  lang?: string;
}

export interface CompileInput {
  version: number;
  categories: Category[];
  ingredients: IngredientRow[];
  aliases: AliasRow[];
  generatedAt?: string;
}

/** Shape of data/starter-rules.json. */
export interface RuleSource {
  version: number;
  categories: Category[];
  ingredients: Array<{
    id: string;
    display_name: string;
    short_name?: string;
    category: string;
    tier: Tier;
    strict_tier: Tier;
    reason_short?: string;
    reason_long?: string;
    e_numbers?: string[];
    aliases: string[];
    sources?: { regulator: string[]; preference: string[] };
  }>;
}

const TIERS: readonly Tier[] = ['good', 'neutral', 'borderline', 'bad'];

/** "E150c", "INS 129", "e-129", "E 330(i)" -> "e150c", "e129", "e129", "e330". Null if not an E/INS code. */
export function eCode(input: string): string | null {
  const k = normKey(input);
  // letter suffixes (E150c, E160a) are part of the code; roman suffixes (E322(i), 500ii) are dropped
  const m = /^(?:e|ins)\s?(?:no\s)?(\d{3,4})\s?([a-h])?\s?(?:i{1,3}|iv|vi?)?$/.exec(k);
  if (!m) return null;
  return `e${m[1]}${m[2] ?? ''}`;
}

/** The alias_norm value for an alias row. */
export function aliasNorm(row: Pick<AliasRow, 'alias' | 'kind'>): string {
  if (row.kind === 'e_number') {
    const c = eCode(row.alias);
    if (!c) throw new Error(`Not a valid E-number alias: "${row.alias}"`);
    return c;
  }
  return normKey(row.alias);
}

export function rowsFromSource(src: RuleSource): Omit<CompileInput, 'generatedAt'> {
  const ingredients: IngredientRow[] = [];
  const aliases: AliasRow[] = [];
  for (const ing of src.ingredients) {
    ingredients.push({
      id: ing.id,
      display_name: ing.display_name,
      short_name: ing.short_name ?? null,
      category: ing.category,
      tier: ing.tier,
      strict_tier: ing.strict_tier,
      reason_short: ing.reason_short ?? '',
      is_active: true,
    });
    for (const a of ing.aliases) aliases.push({ alias: a, ingredient_id: ing.id, kind: 'name', lang: 'en' });
    for (const e of ing.e_numbers ?? []) aliases.push({ alias: e, ingredient_id: ing.id, kind: 'e_number', lang: 'en' });
  }
  return { version: src.version, categories: src.categories, ingredients, aliases };
}

export class BundleError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Rules bundle has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  }
}

/** Compiles table rows into the bundle the app downloads. Throws BundleError on conflicts. */
export function compileBundle(input: CompileInput): RulesBundle {
  const problems: string[] = [];
  const cats = new Set(input.categories.map((c) => c.id));
  const active = new Map<string, IngredientRow>();

  for (const row of input.ingredients) {
    if (row.is_active === false) continue;
    if (active.has(row.id)) problems.push(`duplicate ingredient id "${row.id}"`);
    if (!cats.has(row.category)) problems.push(`ingredient "${row.id}" has unknown category "${row.category}"`);
    if (!TIERS.includes(row.tier)) problems.push(`ingredient "${row.id}" has invalid tier "${row.tier}"`);
    if (!TIERS.includes(row.strict_tier)) problems.push(`ingredient "${row.id}" has invalid strict_tier "${row.strict_tier}"`);
    if (row.tier !== 'neutral' && !row.reason_short.trim()) problems.push(`ingredient "${row.id}" is flagged but has no reason_short`);
    active.set(row.id, row);
  }

  const aliases: Record<string, string> = {};
  const eNumbers: Record<string, string> = {};
  for (const a of input.aliases) {
    if (!active.has(a.ingredient_id)) continue; // inactive or unknown: not shipped
    let key: string;
    try {
      key = aliasNorm(a);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    if (!key) continue;
    const target = a.kind === 'e_number' ? eNumbers : aliases;
    const existing = target[key];
    if (existing && existing !== a.ingredient_id) {
      problems.push(`alias "${key}" maps to both "${existing}" and "${a.ingredient_id}"`);
      continue;
    }
    target[key] = a.ingredient_id;
  }

  if (problems.length) throw new BundleError(problems);

  const ingredients: BundleIngredient[] = [...active.values()].map((r) => ({
    id: r.id,
    name: r.display_name,
    shortName: r.short_name || r.display_name,
    category: r.category,
    tier: r.tier,
    strictTier: r.strict_tier,
    reason: r.reason_short,
    ...(r.learn_more_url ? { learnMoreUrl: r.learn_more_url } : {}),
  }));

  return {
    schema: 1,
    version: input.version,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    categories: input.categories,
    ingredients,
    aliases,
    eNumbers,
  };
}

/** In-memory form of a bundle, built once per bundle version. */
export interface Rules {
  bundle: RulesBundle;
  byId: Map<string, BundleIngredient>;
  categories: Map<string, Category>;
  aliases: Map<string, string>;
  eNumbers: Map<string, string>;
  maxAliasWords: number;
  /** Lazily built index for fuzzy matching. */
  _trigrams?: Map<string, string[]>;
}

export function loadRules(bundle: RulesBundle): Rules {
  if (bundle.schema !== 1) throw new Error(`Unsupported rules bundle schema ${String(bundle.schema)}`);
  const aliases = new Map(Object.entries(bundle.aliases));
  let maxAliasWords = 1;
  for (const k of aliases.keys()) maxAliasWords = Math.max(maxAliasWords, k.split(' ').length);
  return {
    bundle,
    byId: new Map(bundle.ingredients.map((i) => [i.id, i])),
    categories: new Map(bundle.categories.map((c) => [c.id, c])),
    aliases,
    eNumbers: new Map(Object.entries(bundle.eNumbers)),
    maxAliasWords,
  };
}
