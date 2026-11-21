import { describe, expect, it } from 'vitest';
import { analyze, eCode, matchItems, splitIngredients } from '../src';
import { rules } from './helpers';

const ids = (text: string) => {
  const { items } = matchItems(splitIngredients(text), rules);
  return items.flatMap((i) => i.matches.map((m) => m.ingredientId));
};
const one = (text: string) => matchItems(splitIngredients(text), rules).items[0]!;

describe('exact alias pass', () => {
  it.each([
    ['FD&C Red No. 40', 'red_40'],
    ['Allura Red AC', 'red_40'],
    ['Red 40 Lake', 'red_40'],
    ['CI 16035', 'red_40'],
    ['tartrazine', 'yellow_5'],
    ['Sunset Yellow FCF', 'yellow_6'],
    ['indigo carmine', 'blue_1_2'],
    ['erythrosine', 'red_3'],
    ['titanium dioxide', 'titanium_dioxide'],
    ['caramel colour', 'caramel_color'],
    ['HFCS', 'hfcs'],
    ['glucose-fructose syrup', 'hfcs'],
    ['isoglucose', 'hfcs'],
    ['glucose syrup', 'added_sugar'],
    ['acesulfame potassium', 'acesulfame_k'],
    ['tert-butylhydroquinone', 'bha_bht_tbhq'],
    ['monosodium glutamate', 'msg'],
    ['soya oil', 'soybean_oil'],
    ['rapeseed oil', 'canola_oil'],
    ['maize oil', 'corn_oil'],
    ['palmolein', 'palm_oil'],
    ['ghee', 'butter_ghee_tallow'],
    ['bovine gelatine', 'gelatin'],
    ['xanthan gum', 'gums'],
  ])('%s -> %s', (text, id) => expect(ids(text)).toEqual([id]));

  it('is case-insensitive', () => expect(ids('CANOLA OIL')).toEqual(['canola_oil']));
  it('matches plurals', () => expect(ids('natural flavors')).toEqual(['natural_flavors']));
});

describe('longest-first phrases', () => {
  it('high oleic sunflower oil beats sunflower oil', () => expect(ids('high oleic sunflower oil')).toEqual(['high_oleic_oil']));
  it('high fructose corn syrup beats corn syrup', () => expect(ids('high fructose corn syrup')).toEqual(['hfcs']));
  it('cocoa butter is not butter', () => expect(ids('cocoa butter')).toEqual(['cocoa']));
  it('peanut butter is not butter', () => expect(ids('peanut butter')).toEqual(['nuts_seeds']));
  it('corn starch is not corn oil', () => expect(ids('corn starch')).toEqual(['starches']));
  it('caramel colour is not caramel sugar', () => expect(ids('caramel colour')).toEqual(['caramel_color']));
  it('vegetable shortening is vegetable oil, not PHO', () => expect(ids('vegetable shortening')).toEqual(['vegetable_oil']));
  it('extra virgin olive oil', () => expect(ids('extra virgin olive oil')).toEqual(['olive_oil']));
  it('finds several rules inside one item', () =>
    expect(ids('partially hydrogenated soybean oil')).toEqual(['partially_hydrogenated_oil', 'soybean_oil']));
  it('ignores descriptive words', () => expect(ids('roasted peanuts')).toEqual(['nuts_seeds']));
});

describe('E-number / INS pass', () => {
  it.each([
    ['E129', 'e129'],
    ['e 129', 'e129'],
    ['E-129', 'e129'],
    ['INS 129', 'e129'],
    ['INS No. 129', 'e129'],
    ['E150d', 'e150d'],
    ['E322(i)', 'e322'],
    ['500ii', null],
    ['E500ii', 'e500'],
    ['Red 40', null],
  ])('eCode(%s) = %s', (input, out) => expect(eCode(input)).toBe(out));

  it.each([
    ['E129', 'red_40'],
    ['e 102', 'yellow_5'],
    ['INS 110', 'yellow_6'],
    ['E150d', 'caramel_color'],
    ['E171', 'titanium_dioxide'],
    ['E951', 'aspartame'],
    ['E621', 'msg'],
    ['E407a', 'carrageenan'],
  ])('%s -> %s', (text, id) => expect(ids(text)).toEqual([id]));

  it('falls back from a letter suffix to the base code', () => expect(ids('E441a')).toEqual(['gelatin']));
  it('bare numbers under a class label are INS codes', () => expect(ids('Colour (102, 110)')).toEqual(['yellow_5', 'yellow_6']));
  it('bare numbers under a class prefix are INS codes', () => expect(ids('Flavour enhancer: 621')).toEqual(['msg']));
  it('bare numbers elsewhere are codes only when the code is a known rule', () => {
    expect(ids('102')).toEqual(['yellow_5']);
    expect(ids('100 g')).toEqual([]);
  });
  it('logs unknown codes', () => {
    const r = matchItems(splitIngredients('stabiliser (E1520), glazing agent (E999)'), rules);
    expect(r.unmatched).toEqual(['e1520', 'e999']);
  });
  it('class label headers are containers, not unmatched', () => {
    const r = matchItems(splitIngredients('preservatives (zzqx agent)'), rules);
    expect(r.items[0]!.container).toBe(true);
    expect(r.unmatched).toEqual(['zzqx agent']);
  });
  it('strips a class prefix with a colon', () => expect(ids('Emulsifier: soy lecithin')).toEqual(['lecithin']));
});

describe('head nouns and alternative lists', () => {
  it('children borrow the parent head', () =>
    expect(ids('vegetable oil (canola, soybean, sunflower)')).toEqual(['vegetable_oil', 'canola_oil', 'soybean_oil', 'sunflower_oil']));
  it('and/or inside one item', () => expect(ids('canola and/or soybean oil')).toEqual(['canola_oil', 'soybean_oil']));
  it('alternatives across commas', () => expect(ids('canola, soybean, or sunflower oil')).toEqual(['canola_oil', 'soybean_oil', 'sunflower_oil']));
  it('does not borrow from a plain neighbour', () => expect(ids('corn, vegetable oil')).toEqual(['grains', 'vegetable_oil']));
  it('natural and artificial flavors', () => expect(ids('natural and artificial flavors').sort()).toEqual(['artificial_flavors', 'natural_flavors']));
  it('artificial and natural flavours', () => expect(ids('artificial and natural flavours').sort()).toEqual(['artificial_flavors', 'natural_flavors']));
  it('salt and vinegar seasoning', () => expect(ids('salt and vinegar seasoning')).toEqual(['salt', 'vinegars_acids']));
  it('rapeseed and soybean under an oils parent', () =>
    expect(ids('hydrogenated vegetable oils (rapeseed and soybean)')).toEqual(['partially_hydrogenated_oil', 'canola_oil', 'soybean_oil']));
  it('fully hydrogenated oil is judged by the oil, not as trans fat', () =>
    expect(ids('fully hydrogenated vegetable oils (rapeseed and soybean)')).toEqual(['vegetable_oil', 'canola_oil', 'soybean_oil']));
});

describe('flavourings', () => {
  it('butter flavor is a flavouring, not butter', () => expect(ids('butter flavor')).toEqual(['natural_flavors']));
  it('artificial strawberry flavour is artificial', () => expect(ids('artificial strawberry flavour')).toEqual(['artificial_flavors']));
  it('natural vanilla flavouring is natural', () => expect(ids('natural vanilla flavouring')).toEqual(['natural_flavors']));
  it('children of a flavour parent are absorbed', () => {
    const r = matchItems(splitIngredients('Flavour (butter, vanilla)'), rules);
    expect(r.items.flatMap((i) => i.matches.map((m) => m.ingredientId))).toEqual(['natural_flavors']);
    expect(r.unmatched).toEqual([]);
  });
});

describe('OCR fixes and fuzzy pass', () => {
  it('fixes digit/letter confusion when the fix is a known alias', () => {
    const it0 = one('cano1a oil');
    expect(it0.matches[0]).toMatchObject({ ingredientId: 'canola_oil', kind: 'ocr_fix', possible: false });
  });
  it('fixes rn -> m', () => expect(one('aspartarne').matches[0]?.ingredientId).toBe('aspartame'));
  it('fixes m -> rn', () => expect(one('com syrup').matches[0]?.ingredientId).toBe('added_sugar'));
  it('leaves E-codes alone', () => expect(one('E1O2').matches).toEqual([]));
  it('fuzzy matches are only possible', () => {
    expect(one('tartrazlne').matches[0]).toMatchObject({ ingredientId: 'yellow_5', kind: 'fuzzy', possible: true });
  });
  it('fuzzy needs more than 6 letters', () => expect(one('sallt').matches).toEqual([]));
  it('fuzzy keeps first letters', () => expect(one('zodium nitrate').matches).toEqual([]));
  it('fuzzy keeps numbers', () => expect(one('polysorbate 81').matches).toEqual([]));
  it('fuzzy needs the same word count', () => expect(one('canolaoil').matches).toEqual([]));
  it('possible flags still count toward Not Approved', () => {
    const r = analyze('Ingredients: water, salt, sugar, tartrazlne', rules);
    expect(r.verdict).toBe('not_approved');
    expect(r.flagged.find((c) => c.ingredientId === 'yellow_5')?.possible).toBe(true);
    expect(r.suggestAiRecheck).toBe(true);
  });
  it('unknown words are logged as unmatched', () => {
    const r = matchItems(splitIngredients('water, zzqx powder'), rules);
    expect(r.unmatched).toEqual(['zzqx powder']);
  });
  it('dedupes unmatched terms', () => {
    const r = matchItems(splitIngredients('zzqx, zzqx'), rules);
    expect(r.unmatched).toEqual(['zzqx']);
  });
});

describe('positions and flags', () => {
  it('records positions, nested as parent.child', () => {
    const { items } = matchItems(splitIngredients('water, chocolate (sugar, cocoa)'), rules);
    expect(items.map((i) => i.position)).toEqual(['1', '2', '2.1', '2.2']);
    expect(items.map((i) => i.depth)).toEqual([0, 0, 1, 1]);
  });
  it('keeps the expeller-pressed flag on the chip', () => {
    const r = analyze('Ingredients: potatoes, expeller pressed canola oil, salt', rules);
    expect(r.flagged[0]!.flags).toEqual(['expeller_pressed']);
  });
});

describe('real-label fixes (from the benchmark)', () => {
  it('non-hydrogenated vegetable oil is not hydrogenated oil', () => {
    expect(ids('non-hydrogenated vegetable oil')).toEqual(['vegetable_oil']);
    expect(ids('non hydrogenated vegetable oils')).toEqual(['vegetable_oil']);
  });
  it('keeps abbreviations together', () => {
    const r = analyze('Ingredients: milk, cultures (L. bulgaricus, S. thermophilus).', rules);
    expect(r.items.map((i) => i.text)).toContain('L. bulgaricus');
  });
  it('stops at a second-language list', () => {
    const r = analyze('Ingredients: sugar, salt. Ingrédients : sucre, sel.', rules);
    expect(r.items.map((i) => i.key)).toEqual(['sugar', 'salt']);
  });
  it('ignores stray single characters and small numbers', () => {
    const r = analyze('Ingredients: water, l, 2, salt, garlic', rules);
    expect(r.unmatched).toEqual([]);
  });
  it('drops "allergens in bold" notes', () => {
    expect(analyze('Ingredients: water, salt, garlic. Allergens in bold.', rules).unmatched).toEqual([]);
  });
  it('matches a bare known code without a class label', () => expect(ids('621')).toEqual(['msg']));
  it('does not treat a bare unknown number as a code', () => expect(ids('999')).toEqual([]));
  it('fuzzy does not turn peanut oil into plant oil', () => expect(one('peanut oil').matches.filter((m) => m.ingredientId === 'vegetable_oil')).toEqual([]));
});
