export { analyze } from './analyze';
export * from './types';
export * from './bundle';
export { normKey, cleanLabelText, stripFiller, stripPercent, hasCJK, isNoiseKey } from './normalize';
export { isolateIngredients } from './isolate';
export { splitIngredients } from './split';
export { matchItems } from './match';
export { effectiveTier } from './settings';
export { editDistance, trigramSimilarity, fuzzyLookup } from './fuzzy';
export { rollup, summaryFor, joinNames } from './verdict';

export { diffBundles, type BundleDiff, type IngredientChange } from './diff';
export { runFixtures, type LabelFixture, type FixtureResult } from './regression';
export { preparePublish, type PublishPlan } from './publish';
