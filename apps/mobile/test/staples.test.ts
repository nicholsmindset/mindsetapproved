import { analyze, loadRules, type UserSettings } from '@mindset/rules-engine';
import { describe, expect, it } from 'vitest';
import { changeMessage, currentVerdict, milestoneLine, stapleChanges } from '../src/core/staples';
import type { HistoryEntry } from '../src/core/store';
import { shipped } from './helpers';

const rules = loadRules(shipped);
const normal = { strictMode: false, noGelatin: false, disabledCategories: [], disabledIngredients: [] } as UserSettings;

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'e1',
    createdAt: new Date().toISOString(),
    source: 'label',
    text: 'Ingredients: oats, sugar, salt.',
    ocrConfidence: 1,
    verdict: 'caution',
    summary: '',
    rulesVersion: 1,
    favourite: true,
    ...over,
  };
}

describe('saved products (staples)', () => {
  it('reports the verdict a product gets under the current settings', () => {
    expect(currentVerdict(entry(), rules, normal)).toBe(analyze('Ingredients: oats, sugar, salt.', rules, normal).verdict);
  });

  it('flags a saved product when a rule change moves its verdict', () => {
    const e = entry({ savedVerdict: 'caution' });
    expect(stapleChanges([e], rules, normal)).toEqual([]);
    // Turning off "Added sugar" makes the sugar neutral, so the verdict relaxes.
    const relaxed = { ...normal, disabledCategories: ['sugar'] } as UserSettings;
    const changes = stapleChanges([e], rules, relaxed);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.was).toBe('caution');
    expect(changes[0]!.now).not.toBe('caution');
    expect(changeMessage(changes)).toContain('a more relaxed verdict');
    // Strict mode is the other direction.
    const strict = { ...normal, strictMode: true } as UserSettings;
    expect(changeMessage(stapleChanges([e], rules, strict))).toContain('a stricter verdict');
  });

  it('ignores products that are not saved or have no baseline', () => {
    const relaxed = { ...normal, disabledCategories: ['sugar'] } as UserSettings;
    expect(stapleChanges([entry({ favourite: false, savedVerdict: 'caution' })], rules, relaxed)).toEqual([]);
    expect(stapleChanges([entry({ savedVerdict: undefined })], rules, relaxed)).toEqual([]);
  });

  it('words one and several changes', () => {
    const e = entry({ savedVerdict: 'caution' });
    const relaxed = { ...normal, disabledCategories: ['sugar'] } as UserSettings;
    expect(changeMessage(stapleChanges([e], rules, relaxed))).toMatch(/^1 of your saved products now gets/);
    expect(changeMessage(stapleChanges([e, { ...e, id: 'e2' }], rules, relaxed))).toMatch(/^2 of your saved products now get /);
  });
});

describe('milestones', () => {
  it('says something only at round numbers', () => {
    expect(milestoneLine(10)).toBe('That’s 10 products you’ve checked.');
    expect(milestoneLine(100)).toBe('That’s 100 products you’ve checked.');
    for (const n of [1, 2, 9, 11, 24, 99]) expect(milestoneLine(n)).toBeNull();
  });
});
