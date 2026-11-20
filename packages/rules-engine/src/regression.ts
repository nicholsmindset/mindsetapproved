import type { Rules } from './bundle';
import { analyze } from './analyze';
import type { UserSettings, Verdict } from './types';

/** A labelled example: the text and the verdict/flags the rules should produce. */
export interface LabelFixture {
  name: string;
  text: string;
  verdict: Verdict;
  /** Exact set of flagged ingredient ids (bad + borderline). */
  flagged: string[];
  /** Exact set of good ingredient ids, when given. */
  good?: string[];
  /** Number of "may contain" notes, when given. */
  notes?: number;
  settings?: Partial<UserSettings>;
  ocrConfidence?: number;
}

export interface FixtureResult {
  name: string;
  pass: boolean;
  problems: string[];
  verdict: Verdict;
  summary: string;
  flagged: string[];
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

/** Runs regression fixtures against a set of rules (used by tests, the admin publish page and publish-bundle). */
export function runFixtures(rules: Rules, fixtures: LabelFixture[]): FixtureResult[] {
  return fixtures.map((f) => {
    const r = analyze(f.text, rules, f.settings, { ocrConfidence: f.ocrConfidence });
    const flagged = r.flagged.map((c) => c.ingredientId);
    const good = r.good.map((c) => c.ingredientId);
    const problems: string[] = [];
    if (r.verdict !== f.verdict) problems.push(`verdict ${r.verdict}, expected ${f.verdict}`);
    if (!sameSet(flagged, f.flagged)) {
      const extra = flagged.filter((x) => !f.flagged.includes(x));
      const missing = f.flagged.filter((x) => !flagged.includes(x));
      problems.push(`flagged${extra.length ? ` +${extra.join(',')}` : ''}${missing.length ? ` -${missing.join(',')}` : ''}`);
    }
    if (f.good && !sameSet(good, f.good)) problems.push(`good [${good.join(',')}], expected [${f.good.join(',')}]`);
    if (f.notes !== undefined && r.notes.length !== f.notes) problems.push(`${r.notes.length} notes, expected ${f.notes}`);
    return { name: f.name, pass: problems.length === 0, problems, verdict: r.verdict, summary: r.summary, flagged };
  });
}
