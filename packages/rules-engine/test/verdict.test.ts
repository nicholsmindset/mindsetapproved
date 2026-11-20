import { describe, expect, it } from 'vitest';
import { analyze, effectiveTier, joinNames, rollup, summaryFor, type Chip, type UserSettings } from '../src';
import { DEFAULT_SETTINGS } from '../src/types';
import { rules } from './helpers';

const ing = (id: string) => rules.byId.get(id)!;
const tier = (id: string, s: Partial<UserSettings> = {}) => effectiveTier(ing(id), { ...DEFAULT_SETTINGS, ...s }, rules);

describe('effectiveTier', () => {
  it('uses tier by default', () => expect(tier('natural_flavors')).toBe('borderline'));
  it.each(['natural_flavors', 'added_sugar', 'carrageenan', 'msg', 'vegetable_oil', 'high_oleic_oil', 'caramel_color', 'sodium_benzoate', 'polysorbate_80'])(
    'strict mode makes %s bad',
    (id) => expect(tier(id, { strictMode: true })).toBe('bad'),
  );
  it('strict mode makes gums borderline', () => expect(tier('gums', { strictMode: true })).toBe('borderline'));
  it('strict mode keeps palm oil borderline', () => expect(tier('palm_oil', { strictMode: true })).toBe('borderline'));
  it('strict mode keeps gelatin borderline', () => expect(tier('gelatin', { strictMode: true })).toBe('borderline'));
  it('strict mode keeps good fats good', () => expect(tier('olive_oil', { strictMode: true })).toBe('good'));
  it('No gelatin makes gelatin bad', () => expect(tier('gelatin', { noGelatin: true })).toBe('bad'));
  it('a disabled category is neutral', () => expect(tier('added_sugar', { disabledCategories: ['sugar'] })).toBe('neutral'));
  it('a disabled category beats strict mode', () =>
    expect(tier('added_sugar', { strictMode: true, disabledCategories: ['sugar'] })).toBe('neutral'));
  it('a disabled ingredient is neutral', () => expect(tier('high_oleic_oil', { disabledIngredients: ['high_oleic_oil'] })).toBe('neutral'));
  it('a non-toggleable category ignores the switch', () => expect(tier('avocado_oil', { disabledCategories: ['good_fat'] })).toBe('good'));
  it('a disabled ingredient overrides No gelatin', () =>
    expect(tier('gelatin', { noGelatin: true, disabledIngredients: ['gelatin'] })).toBe('neutral'));
});

const base = {
  hasBad: false,
  hasBorderline: false,
  confidentCount: 5,
  leafCount: 5,
  unmatchedLeafCount: 0,
  ocrConfidence: 1,
  minConfidence: 0.8,
  minParsed: 3,
  maxUnmatchedRatio: 0.5,
};

describe('rollup', () => {
  it('bad wins', () => expect(rollup({ ...base, hasBad: true, hasBorderline: true })).toBe('not_approved'));
  it('bad wins even on a poor read', () => expect(rollup({ ...base, hasBad: true, ocrConfidence: 0.1, confidentCount: 0 })).toBe('not_approved'));
  it('borderline gives caution', () => expect(rollup({ ...base, hasBorderline: true })).toBe('caution'));
  it('clean good read is approved', () => expect(rollup(base)).toBe('approved'));
  it('fewer than 3 parsed is cant_verify', () => expect(rollup({ ...base, confidentCount: 2 })).toBe('cant_verify'));
  it('exactly 3 parsed is approved', () => expect(rollup({ ...base, confidentCount: 3 })).toBe('approved'));
  it('low OCR confidence is cant_verify', () => expect(rollup({ ...base, ocrConfidence: 0.79 })).toBe('cant_verify'));
  it('confidence at the threshold is approved', () => expect(rollup({ ...base, ocrConfidence: 0.8 })).toBe('approved'));
  it('mostly unmatched is cant_verify', () => expect(rollup({ ...base, leafCount: 10, unmatchedLeafCount: 6 })).toBe('cant_verify'));
  it('half unmatched is still approved', () => expect(rollup({ ...base, leafCount: 10, unmatchedLeafCount: 5 })).toBe('approved'));
});

const chip = (shortName: string, t: Chip['tier']): Chip => ({
  ingredientId: shortName, name: shortName, shortName, category: 'x', tier: t, baseTier: t, reason: '', labelText: shortName, position: '1', possible: false, flags: [],
});

describe('summary copy', () => {
  it('approved', () => expect(summaryFor('approved', [])).toBe('Mindset Approved — no flagged ingredients found.'));
  it('caution plural', () =>
    expect(summaryFor('caution', [chip('a', 'borderline'), chip('b', 'borderline')])).toBe('Caution — 2 borderline ingredients.'));
  it('caution singular', () => expect(summaryFor('caution', [chip('a', 'borderline')])).toBe('Caution — 1 borderline ingredient.'));
  it('not approved names bad ingredients only', () =>
    expect(summaryFor('not_approved', [chip('canola oil', 'bad'), chip('Red 40', 'bad'), chip('sugar', 'borderline')])).toBe(
      'Not Approved — contains canola oil and Red 40.',
    ));
  it('cant verify', () => expect(summaryFor('cant_verify', [])).toBe("Can't verify — retake the photo."));
  it.each([
    [['a'], 'a'],
    [['a', 'b'], 'a and b'],
    [['a', 'b', 'c'], 'a, b and c'],
    [['a', 'b', 'c', 'd', 'e'], 'a, b, c and 2 more'],
  ])('joinNames(%j)', (names, out) => expect(joinNames(names)).toBe(out));
  it('the PRD example', () =>
    expect(analyze('Ingredients: corn, canola oil, salt, Red 40.', rules).summary).toBe('Not Approved — contains canola oil and Red 40.'));
});

describe('analyze result shape', () => {
  const r = analyze('Ingredients: potatoes, avocado oil, sea salt, sugar, canola oil. May contain milk.', rules);
  it('flags bad before borderline', () => expect(r.flagged.map((c) => c.tier)).toEqual(['bad', 'borderline']));
  it('lists good chips', () => expect(r.good.map((c) => c.ingredientId)).toEqual(['avocado_oil']));
  it('lists neutral chips', () => expect(r.neutral.map((c) => c.ingredientId)).toEqual(['vegetables', 'salt']));
  it('keeps notes', () => expect(r.notes).toEqual(['May contain milk']));
  it('reports the rules version', () => expect(r.rulesVersion).toBe(1));
  it('chips carry reasons and label text', () => {
    const c = r.flagged[0]!;
    expect(c.reason.length).toBeGreaterThan(10);
    expect(c.labelText).toBe('canola oil');
    expect(c.position).toBe('5');
  });
  it('accepts a raw bundle as well as loaded rules', () => {
    expect(analyze('Ingredients: water, salt, garlic', rules.bundle).verdict).toBe('approved');
  });
  it('no header suggests an AI re-check', () => expect(analyze('water, salt, garlic', rules).suggestAiRecheck).toBe(true));
  it('a clean read does not suggest an AI re-check', () =>
    expect(analyze('Ingredients: water, salt, garlic', rules).suggestAiRecheck).toBe(false));
  it('empty text is cant_verify', () => expect(analyze('', rules).verdict).toBe('cant_verify'));
  it('respects a custom minParsed', () =>
    expect(analyze('Ingredients: peanuts, salt', rules, {}, { minParsed: 2 }).verdict).toBe('approved'));
});
