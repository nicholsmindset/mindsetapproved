import { rowsFromSource, type RuleSource } from '@mindset/rules-engine';
import starter from '@mindset/rules-data/starter-rules.json';
import { describe, expect, it } from 'vitest';
import { buildSuggestIndex, suggestMatches } from './suggest';

const draft = rowsFromSource(starter as RuleSource);
const index = buildSuggestIndex(draft.ingredients, draft.aliases);
const top = (term: string) => suggestMatches(term, index)[0]?.ingredientId;

describe('suggestMatches', () => {
  it.each([
    ['organic cane sugar syrup blend', 'added_sugar'],
    ['canola oyl', 'canola_oil'],
    ['refined palm olein oil', 'palm_oil'],
    ['sunflower', 'sunflower_oil'],
    ['低糖白砂糖', 'added_sugar'],
  ])('%s -> %s', (term, id) => expect(top(term)).toBe(id));

  it('returns at most three, one per rule, best first', () => {
    const s = suggestMatches('sugar and palm oil', index);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(new Set(s.map((x) => x.ingredientId)).size).toBe(s.length);
    for (let i = 1; i < s.length; i++) expect(s[i - 1]!.score).toBeGreaterThanOrEqual(s[i]!.score);
  });

  it('suggests nothing for noise', () => {
    expect(suggestMatches('zqxj', index)).toEqual([]);
    expect(suggestMatches('', index)).toEqual([]);
  });
});
