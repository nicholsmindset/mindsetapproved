export type Tier = 'good' | 'neutral' | 'borderline' | 'bad';
export type Verdict = 'approved' | 'caution' | 'not_approved' | 'cant_verify';

export interface Category {
  id: string;
  label: string;
  toggleable: boolean;
}

/** One canonical ingredient as shipped in the rules bundle. */
export interface BundleIngredient {
  id: string;
  name: string;
  shortName: string;
  category: string;
  tier: Tier;
  strictTier: Tier;
  reason: string;
  learnMoreUrl?: string;
}

/** The compiled, versioned rules bundle the app downloads (JSON, gzipped in transit). */
export interface RulesBundle {
  schema: 1;
  version: number;
  generatedAt: string;
  categories: Category[];
  ingredients: BundleIngredient[];
  /** normalised alias -> ingredient id */
  aliases: Record<string, string>;
  /** canonical E/INS code ("e129", "e150d") -> ingredient id */
  eNumbers: Record<string, string>;
}

export interface UserSettings {
  strictMode: boolean;
  /** Category ids the user has switched off; their ingredients count as neutral. */
  disabledCategories: string[];
  /** Ingredient ids the user has switched off (e.g. "high_oleic_oil"); they count as neutral. */
  disabledIngredients: string[];
  /** Moves animal-derived ingredients (gelatin) to bad. */
  noGelatin: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  strictMode: false,
  disabledCategories: [],
  disabledIngredients: [],
  noGelatin: false,
};

export type MatchKind = 'alias' | 'e_number' | 'ocr_fix' | 'fuzzy' | 'inferred';

export interface IngredientMatch {
  ingredientId: string;
  /** The alias or code that matched, normalised. */
  matched: string;
  kind: MatchKind;
  /** Fuzzy matches are only "possible": they can flag but never count toward Approved. */
  possible: boolean;
}

export interface ParsedItem {
  /** Text as written on the label (cleaned, original case). */
  text: string;
  /** Normalised key used for matching. */
  key: string;
  /** "3" or "3.2" for nested items; earlier = more of it. */
  position: string;
  depth: number;
  matches: IngredientMatch[];
  flags: string[];
  /** True when nothing in the bundle matched this item. */
  unmatched: boolean;
  /** Compound or class headers ("chocolate chips (...)", "colour (...)") that need no match themselves. */
  container: boolean;
}

export interface Chip {
  ingredientId: string;
  name: string;
  shortName: string;
  category: string;
  /** Tier after strict mode and toggles. */
  tier: Tier;
  baseTier: Tier;
  reason: string;
  /** Label text that triggered it. */
  labelText: string;
  position: string;
  possible: boolean;
  flags: string[];
}

export interface AnalyzeOptions {
  /** 0..1 OCR confidence; use 1 for barcode/database text. */
  ocrConfidence?: number;
  /** Minimum OCR confidence for an Approved verdict. Default 0.8. */
  minConfidence?: number;
  /** Minimum confidently matched ingredients for Approved. Default 3. */
  minParsed?: number;
  /** Above this share of unmatched leaf items the verdict is Can't verify instead of Approved. Default 0.5. */
  maxUnmatchedRatio?: number;
}

export interface AnalyzeResult {
  verdict: Verdict;
  summary: string;
  /** Bad first, then borderline; deduplicated by ingredient. */
  flagged: Chip[];
  good: Chip[];
  neutral: Chip[];
  /** Normalised terms that matched nothing (fed to unmatched_terms). */
  unmatched: string[];
  /** "May contain" / facility statements; never affect the verdict. */
  notes: string[];
  items: ParsedItem[];
  headerFound: boolean;
  /** Suggest offering "Re-check with AI". */
  suggestAiRecheck: boolean;
  rulesVersion: number;
}
