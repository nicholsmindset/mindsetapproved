import { describe, expect, it } from 'vitest';
import { analyze, type UserSettings, type Verdict } from '../src';
import fixtures from './fixtures/labels.json';
import { rules } from './helpers';

interface Fixture {
  name: string;
  text: string;
  verdict: Verdict;
  flagged: string[];
  good?: string[];
  notes?: number;
  settings?: Partial<UserSettings>;
  ocrConfidence?: number;
}

describe('real-world label fixtures', () => {
  for (const f of fixtures as Fixture[]) {
    it(f.name, () => {
      const r = analyze(f.text, rules, f.settings, { ocrConfidence: f.ocrConfidence });
      const ctx = { summary: r.summary, unmatched: r.unmatched };
      expect({ verdict: r.verdict, ...ctx }).toMatchObject({ verdict: f.verdict });
      expect(r.flagged.map((c) => c.ingredientId).sort(), JSON.stringify(ctx)).toEqual([...f.flagged].sort());
      if (f.good) expect(r.good.map((c) => c.ingredientId).sort()).toEqual([...f.good].sort());
      if (f.notes !== undefined) expect(r.notes).toHaveLength(f.notes);
    });
  }
});
