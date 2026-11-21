import { describe, expect, it } from 'vitest';
import { analyze } from '../../packages/rules-engine/src/index.ts';
import { loadProducts, runBenchmark, starterRules } from './run.ts';

const rules = starterRules();
const result = runBenchmark(loadProducts(), rules);

describe('real-product benchmark (data/benchmark/products.json)', () => {
  it('understands at least 93% of ingredient items (PRD target: 90%)', () => {
    expect(result.coverage).toBeGreaterThanOrEqual(0.93);
  });
  it('covers every market at 85% or better', () => {
    for (const [country, c] of Object.entries(result.byCountry)) expect(c.coverage, country).toBeGreaterThanOrEqual(0.85);
  });
  it('never reads "non-hydrogenated" or "fully hydrogenated" as partially hydrogenated oil', () => {
    for (const t of result.triggers['partially_hydrogenated_oil'] ?? []) expect(t.text).not.toMatch(/\b(non|fully)\b/);
  });
  it('never fuzzy-matches a different oil', () => {
    expect(analyze('Ingredients: peanut oil, salt, sugar', rules).flagged.map((c) => c.ingredientId)).toEqual(['peanut_oil', 'added_sugar']);
  });
});
