import { describe, expect, it } from 'vitest';
import { analyze } from '../src';
import { rules } from './helpers';

const LABEL =
  'INGREDIENTS: Enriched flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), sugar, ' +
  'vegetable oil (canola, soybean and/or palm oil), high fructose corn syrup, cocoa (processed with alkali), corn starch, ' +
  'contains 2% or less of: salt, baking soda, soy lecithin, natural and artificial flavors, caramel color, red 40, yellow 5, ' +
  'sodium benzoate, xanthan gum, carrageenan, whey, eggs, milk, tbhq, mono and diglycerides, citric acid, vanilla extract, tartrazlne. ' +
  'May contain traces of peanuts.';

describe('performance', () => {
  it('matches a 30+ ingredient label in under 20 ms', () => {
    analyze(LABEL, rules); // warm-up builds the fuzzy index
    const runs = 50;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) analyze(LABEL, rules);
    const avg = (performance.now() - t0) / runs;
    console.log(`analyze: ${avg.toFixed(2)} ms per label`);
    expect(avg).toBeLessThan(20);
  });
});
