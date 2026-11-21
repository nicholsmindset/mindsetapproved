import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { aliasNorm, BundleError, compileBundle, loadRules, type CompileInput } from '../src';
import { bundle } from './helpers';

const cats = [{ id: 'dye', label: 'Dyes', toggleable: true }];
const input = (over: Partial<CompileInput> = {}): CompileInput => ({
  version: 7,
  categories: cats,
  ingredients: [{ id: 'red_40', display_name: 'Red 40', category: 'dye', tier: 'bad', strict_tier: 'bad', reason_short: 'A dye.' }],
  aliases: [
    { alias: 'Allura Red AC', ingredient_id: 'red_40', kind: 'name' },
    { alias: 'E129', ingredient_id: 'red_40', kind: 'e_number' },
  ],
  generatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

describe('compileBundle', () => {
  it('normalises aliases and codes', () => {
    const b = compileBundle(input());
    expect(b.aliases).toEqual({ 'allura red ac': 'red_40' });
    expect(b.eNumbers).toEqual({ e129: 'red_40' });
    expect(b.version).toBe(7);
    expect(b.ingredients[0]).toMatchObject({ id: 'red_40', shortName: 'Red 40', tier: 'bad' });
  });
  it('rejects an alias that maps to two ingredients', () => {
    const i = input();
    i.ingredients.push({ id: 'other', display_name: 'Other', category: 'dye', tier: 'bad', strict_tier: 'bad', reason_short: 'x' });
    i.aliases.push({ alias: 'allura  red ac', ingredient_id: 'other', kind: 'name' });
    expect(() => compileBundle(i)).toThrow(BundleError);
  });
  it('rejects unknown categories', () => {
    expect(() => compileBundle(input({ categories: [] }))).toThrow(/unknown category/);
  });
  it('rejects a flagged ingredient without a reason', () => {
    const i = input();
    i.ingredients[0]!.reason_short = '';
    expect(() => compileBundle(i)).toThrow(/no reason_short/);
  });
  it('rejects an invalid E-number alias', () => {
    const i = input();
    i.aliases.push({ alias: 'red', ingredient_id: 'red_40', kind: 'e_number' });
    expect(() => compileBundle(i)).toThrow(/Not a valid E-number/);
  });
  it('skips inactive ingredients and their aliases', () => {
    const i = input();
    i.ingredients[0]!.is_active = false;
    const b = compileBundle(i);
    expect(b.ingredients).toEqual([]);
    expect(b.aliases).toEqual({});
  });
  it('allows the same alias twice for one ingredient', () => {
    const i = input();
    i.aliases.push({ alias: 'ALLURA RED AC', ingredient_id: 'red_40', kind: 'name' });
    expect(() => compileBundle(i)).not.toThrow();
  });
  it('aliasNorm matches the engine normal form', () => {
    expect(aliasNorm({ alias: 'FD&C Red No. 40', kind: 'name' })).toBe('fd c red no 40');
    expect(aliasNorm({ alias: 'INS 129', kind: 'e_number' })).toBe('e129');
  });
  it('rejects unknown schemas on load', () => {
    expect(() => loadRules({ ...bundle, schema: 2 as 1 })).toThrow(/schema/);
  });
});

describe('starter bundle', () => {
  it('compiles without conflicts', () => {
    expect(bundle.ingredients.length).toBeGreaterThan(50);
    expect(Object.keys(bundle.aliases).length).toBeGreaterThan(300);
  });
  it('has all 37 PRD rules', () => {
    const PRD = ['canola_oil', 'soybean_oil', 'corn_oil', 'cottonseed_oil', 'sunflower_oil', 'high_oleic_oil', 'grapeseed_oil', 'vegetable_oil',
      'partially_hydrogenated_oil', 'palm_oil', 'avocado_oil', 'olive_oil', 'coconut_oil', 'butter_ghee_tallow', 'red_40', 'yellow_5', 'yellow_6',
      'blue_1_2', 'red_3', 'titanium_dioxide', 'caramel_color', 'hfcs', 'added_sugar', 'aspartame', 'sucralose', 'acesulfame_k', 'saccharin',
      'artificial_flavors', 'natural_flavors', 'bha_bht_tbhq', 'nitrites_nitrates', 'sodium_benzoate', 'msg', 'carrageenan', 'polysorbate_80',
      'gelatin', 'gums'];
    expect(PRD).toHaveLength(37);
    const ids = new Set(bundle.ingredients.map((i) => i.id));
    expect(PRD.filter((id) => !ids.has(id))).toEqual([]);
  });
  it('every non-neutral rule has a reason', () => {
    for (const i of bundle.ingredients) if (i.tier !== 'neutral' || i.strictTier !== 'neutral') expect(i.reason, i.id).not.toBe('');
  });
  it('reasons avoid health-claim words', () => {
    for (const i of bundle.ingredients) expect(i.reason, i.id).not.toMatch(/toxic|poison|dangerous|cancer|disease|unhealthy|harmful/i);
  });
  it('seed-oil reasons are labelled as preferences', () => {
    for (const i of bundle.ingredients.filter((x) => x.category === 'seed_oil' && x.tier === 'bad')) expect(i.reason).toMatch(/preference/);
  });
  it('is small once gzipped', () => {
    const gz = gzipSync(JSON.stringify(bundle)).length;
    console.log(`starter bundle: ${JSON.stringify(bundle).length} bytes, ${gz} bytes gzipped`);
    expect(gz).toBeLessThan(100_000);
  });
});
