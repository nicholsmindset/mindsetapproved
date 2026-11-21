import { DEFAULT_SETTINGS, type UserSettings } from '@mindset/rules-engine';

/** Row shape of public.user_settings. */
export interface SettingsRow {
  user_id: string;
  strict_mode: boolean;
  no_gelatin: boolean;
  disabled_categories: string[];
  disabled_ingredients: string[];
  updated_at?: string;
}

export function toRow(userId: string, s: UserSettings): SettingsRow {
  return {
    user_id: userId,
    strict_mode: s.strictMode,
    no_gelatin: s.noGelatin,
    disabled_categories: [...new Set(s.disabledCategories)].sort(),
    disabled_ingredients: [...new Set(s.disabledIngredients)].sort(),
  };
}

export function fromRow(r: Partial<SettingsRow> | null | undefined): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    strictMode: r?.strict_mode ?? false,
    noGelatin: r?.no_gelatin ?? false,
    disabledCategories: r?.disabled_categories ?? [],
    disabledIngredients: r?.disabled_ingredients ?? [],
  };
}

export function isDefault(s: UserSettings): boolean {
  return !s.strictMode && !s.noGelatin && s.disabledCategories.length === 0 && s.disabledIngredients.length === 0;
}

/**
 * On sign-in: the account's saved rules win, unless the account has none yet; then this phone's rules are
 * uploaded. A brand-new phone (default rules) never overwrites an account's rules.
 */
export function resolveOnSignIn(local: UserSettings, remote: SettingsRow | null): { settings: UserSettings; upload: boolean } {
  if (remote) return { settings: fromRow(remote), upload: false };
  return { settings: local, upload: !isDefault(local) };
}
