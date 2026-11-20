import type { Tier } from '@mindset/rules-engine';

export const TIERS: Tier[] = ['good', 'neutral', 'borderline', 'bad'];

export interface IngredientRow {
  id: string;
  display_name: string;
  short_name: string | null;
  category: string;
  tier: Tier | null;
  strict_tier: Tier | null;
  reason_short: string;
  reason_long: string | null;
  learn_more_url: string | null;
  e_number: string | null;
  off_tag: string | null;
  sources: { regulator?: string[]; preference?: string[] } | null;
  is_active: boolean;
  updated_at: string;
}

export interface AliasRow {
  id: number;
  alias: string;
  alias_norm: string;
  ingredient_id: string;
  lang: string;
  kind: 'name' | 'e_number' | 'ocr_misspelling';
}

export interface CategoryRow {
  id: string;
  label: string;
  toggleable: boolean;
  sort_order: number;
}
