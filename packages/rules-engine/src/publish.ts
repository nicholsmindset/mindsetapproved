import { compileBundle, loadRules, type CompileInput } from './bundle';
import { diffBundles, type BundleDiff } from './diff';
import { runFixtures, type FixtureResult, type LabelFixture } from './regression';
import type { RulesBundle } from './types';

export interface PublishPlan {
  bundle: RulesBundle;
  diff: BundleDiff;
  results: FixtureResult[];
  failures: FixtureResult[];
  /** Why publishing should not go ahead without an explicit override; empty when it can. */
  blockers: string[];
}

/**
 * Everything the publish step checks, as a pure function: compile the draft (export_rules() output),
 * diff it against the last published bundle and run the regression fixtures.
 * Used by the admin preview and the publish-bundle Edge Function.
 */
export function preparePublish(input: {
  draft: Omit<CompileInput, 'version'>;
  previous: RulesBundle | null;
  fixtures: LabelFixture[];
  version?: number;
  generatedAt?: string;
}): PublishPlan {
  const version = input.version ?? (input.previous?.version ?? 0) + 1;
  const bundle = compileBundle({ ...input.draft, version, generatedAt: input.generatedAt });
  const diff = diffBundles(input.previous, bundle);
  const results = runFixtures(loadRules(bundle), input.fixtures);
  const failures = results.filter((r) => !r.pass);
  const blockers: string[] = [];
  if (diff.isEmpty) blockers.push('Nothing changed since the last published version.');
  if (failures.length) blockers.push(`${failures.length} regression fixture(s) fail.`);
  return { bundle, diff, results, failures, blockers };
}
