import { describe, expect, it } from 'vitest';
import source from '../../../data/starter-rules.json';
import { diffBundles, loadRules, preparePublish, rowsFromSource, runFixtures, type LabelFixture, type RuleSource, type RulesBundle } from '../src';
import fixtures from './fixtures/labels.json';
import { bundle } from './helpers';

const clone = (): RulesBundle => JSON.parse(JSON.stringify(bundle)) as RulesBundle;

describe('diffBundles', () => {
  it('is empty for identical bundles', () => expect(diffBundles(bundle, clone()).isEmpty).toBe(true));
  it('treats a first publish as all added', () => {
    const d = diffBundles(null, bundle);
    expect(d.addedIngredients).toHaveLength(bundle.ingredients.length);
    expect(d.addedAliases.length).toBe(Object.keys(bundle.aliases).length + Object.keys(bundle.eNumbers).length);
  });
  it('reports a re-tier', () => {
    const next = clone();
    next.ingredients.find((i) => i.id === 'palm_oil')!.tier = 'bad';
    const d = diffBundles(bundle, next);
    expect(d.changedIngredients).toEqual([{ id: 'palm_oil', name: 'Palm oil', fields: [{ field: 'tier', from: 'borderline', to: 'bad' }] }]);
  });
  it('reports added, removed and moved aliases', () => {
    const next = clone();
    next.aliases['ponceau 4r'] = 'red_40';
    delete next.aliases['colza oil'];
    next.eNumbers['e211'] = 'msg';
    const d = diffBundles(bundle, next);
    expect(d.addedAliases).toEqual([{ key: 'ponceau 4r', ingredientId: 'red_40' }]);
    expect(d.removedAliases).toEqual([{ key: 'colza oil', ingredientId: 'canola_oil' }]);
    expect(d.movedAliases).toEqual([{ key: 'e211', from: 'sodium_benzoate', to: 'msg' }]);
  });
  it('reports added and removed ingredients', () => {
    const next = clone();
    next.ingredients = next.ingredients.filter((i) => i.id !== 'tea_coffee');
    next.ingredients.push({ id: 'x', name: 'X', shortName: 'x', category: 'dye', tier: 'bad', strictTier: 'bad', reason: 'r' });
    const d = diffBundles(bundle, next);
    expect(d.addedIngredients.map((i) => i.id)).toEqual(['x']);
    expect(d.removedIngredients.map((i) => i.id)).toEqual(['tea_coffee']);
  });
});

describe('runFixtures', () => {
  const fx: LabelFixture[] = [
    { name: 'ok', text: 'Ingredients: potatoes, canola oil, salt', verdict: 'not_approved', flagged: ['canola_oil'] },
    { name: 'wrong', text: 'Ingredients: potatoes, palm oil, salt', verdict: 'approved', flagged: [] },
  ];
  it('passes and fails with reasons', () => {
    const [a, b] = runFixtures(loadRules(bundle), fx);
    expect(a!.pass).toBe(true);
    expect(b!.pass).toBe(false);
    expect(b!.problems).toEqual(['verdict caution, expected approved', 'flagged +palm_oil']);
  });
  it('catches a rule change that breaks a fixture', () => {
    const next = clone();
    next.ingredients.find((i) => i.id === 'canola_oil')!.tier = 'neutral';
    expect(runFixtures(loadRules(next), fx)[0]!.pass).toBe(false);
  });
});

describe('preparePublish', () => {
  const draft = rowsFromSource(source as RuleSource);
  it('first publish is version 1 with everything added and no failures', () => {
    const p = preparePublish({ draft, previous: null, fixtures: fixtures as LabelFixture[] });
    expect(p.bundle.version).toBe(1);
    expect(p.failures).toEqual([]);
    expect(p.blockers).toEqual([]);
  });
  it('blocks an unchanged republish', () => {
    const p = preparePublish({ draft, previous: { ...bundle, version: 4 }, fixtures: [] });
    expect(p.bundle.version).toBe(5);
    expect(p.blockers).toEqual(['Nothing changed since the last published version.']);
  });
  it('blocks a change that breaks fixtures', () => {
    const broken = { ...draft, ingredients: draft.ingredients.map((i) => (i.id === 'canola_oil' ? { ...i, tier: 'neutral' as const } : i)) };
    const p = preparePublish({ draft: broken, previous: bundle, fixtures: fixtures as LabelFixture[] });
    expect(p.diff.changedIngredients.map((c) => c.id)).toEqual(['canola_oil']);
    expect(p.failures.length).toBeGreaterThan(0);
    expect(p.blockers[0]).toMatch(/regression fixture/);
  });
});
