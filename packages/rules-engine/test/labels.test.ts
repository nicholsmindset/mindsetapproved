import { describe, expect, it } from 'vitest';
import { runFixtures, type LabelFixture } from '../src';
import fixtures from './fixtures/labels.json';
import { rules } from './helpers';

describe('real-world label fixtures', () => {
  const results = runFixtures(rules, fixtures as LabelFixture[]);
  for (const r of results) {
    it(r.name, () => expect(r.problems, `${r.summary}`).toEqual([]));
  }
});
