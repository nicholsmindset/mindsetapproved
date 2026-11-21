import { DEFAULT_SETTINGS } from '@mindset/rules-engine';
import { describe, expect, it } from 'vitest';
import { fromRow, isDefault, resolveOnSignIn, toRow } from '../src/core/settings-sync';

const custom = { ...DEFAULT_SETTINGS, strictMode: true, disabledCategories: ['sugar', 'sugar'], disabledIngredients: ['high_oleic_oil'] };

describe('settings sync', () => {
  it('round-trips through the row shape', () => {
    const row = toRow('u1', custom);
    expect(row).toEqual({ user_id: 'u1', strict_mode: true, no_gelatin: false, disabled_categories: ['sugar'], disabled_ingredients: ['high_oleic_oil'] });
    expect(fromRow(row)).toEqual({ ...custom, disabledCategories: ['sugar'] });
  });
  it('treats a missing row as defaults', () => expect(fromRow(null)).toEqual(DEFAULT_SETTINGS));
  it('knows default settings', () => {
    expect(isDefault(DEFAULT_SETTINGS)).toBe(true);
    expect(isDefault(custom)).toBe(false);
  });
  it('the account wins when it has saved rules', () => {
    const r = resolveOnSignIn(custom, toRow('u1', { ...DEFAULT_SETTINGS, noGelatin: true }));
    expect(r).toEqual({ settings: { ...DEFAULT_SETTINGS, noGelatin: true }, upload: false });
  });
  it('uploads this phone’s rules to a fresh account', () => expect(resolveOnSignIn(custom, null)).toEqual({ settings: custom, upload: true }));
  it('a fresh phone with defaults uploads nothing', () => expect(resolveOnSignIn(DEFAULT_SETTINGS, null).upload).toBe(false));
});
