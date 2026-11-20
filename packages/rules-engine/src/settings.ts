import type { Rules } from './bundle';
import type { BundleIngredient, Tier, UserSettings } from './types';

/** Tier after strict mode, the "No gelatin" toggle and user switch-offs. Switched-off rules count as neutral. */
export function effectiveTier(ing: BundleIngredient, settings: UserSettings, rules: Rules): Tier {
  let tier = settings.strictMode ? ing.strictTier : ing.tier;
  if (settings.noGelatin && ing.category === 'animal_derived') tier = 'bad';
  const cat = rules.categories.get(ing.category);
  const categoryOff = settings.disabledCategories.includes(ing.category) && cat?.toggleable !== false;
  if (categoryOff || settings.disabledIngredients.includes(ing.id)) tier = 'neutral';
  return tier;
}

export const TIER_RANK: Record<Tier, number> = { good: 0, neutral: 1, borderline: 2, bad: 3 };
