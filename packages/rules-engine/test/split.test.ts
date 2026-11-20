import { describe, expect, it } from 'vitest';
import { splitIngredients } from '../src';

const names = (t: string) => splitIngredients(t).map((i) => i.name);

describe('splitIngredients', () => {
  it('splits on commas', () => expect(names('water, salt, sugar')).toEqual(['water', 'salt', 'sugar']));
  it('keeps commas inside brackets', () => {
    const r = splitIngredients('chocolate (sugar, cocoa butter, soy lecithin), salt');
    expect(r.map((i) => i.name)).toEqual(['chocolate', 'salt']);
    expect(r[0]!.children.map((c) => c.name)).toEqual(['sugar', 'cocoa butter', 'soy lecithin']);
  });
  it('recurses into nested brackets', () => {
    const r = splitIngredients('creamer (glucose syrup, stabilisers (E340, E452)), coffee');
    expect(r[0]!.children[1]!.children.map((c) => c.name)).toEqual(['E340', 'E452']);
  });
  it('supports square and curly brackets', () => {
    const r = splitIngredients('seasoning [salt, sugar], spice {pepper}');
    expect(r[0]!.children.map((c) => c.name)).toEqual(['salt', 'sugar']);
    expect(r[1]!.children.map((c) => c.name)).toEqual(['pepper']);
  });
  it('tolerates a missing closing bracket', () => {
    const r = splitIngredients('chocolate (sugar, cocoa');
    expect(r[0]!.children.map((c) => c.name)).toEqual(['sugar', 'cocoa']);
  });
  it('ignores a stray closing bracket', () => expect(names('sugar), salt')).toEqual(['sugar', 'salt']));
  it('strips leading "and/or"', () => {
    const r = splitIngredients('canola, soybean, and/or sunflower oil');
    expect(r.map((i) => i.name)).toEqual(['canola', 'soybean', 'sunflower oil']);
    expect(r[2]!.orPrefix).toBe(true);
  });
  it('merges roman sub-indexes into codes', () => {
    expect(names('E322(i), 500(ii)')).toEqual(['E322i', '500ii']);
  });
  it('drops empty items', () => expect(names('water,, salt, ')).toEqual(['water', 'salt']));
  it('attaches a bracket after a comma to the previous item', () => {
    const r = splitIngredients('flour, (wheat, barley)');
    expect(r).toHaveLength(1);
    expect(r[0]!.children.map((c) => c.name)).toEqual(['wheat', 'barley']);
  });
  it('joins text around a bracket group', () => expect(names('milk chocolate (sugar) chips')).toEqual(['milk chocolate chips']));
});
