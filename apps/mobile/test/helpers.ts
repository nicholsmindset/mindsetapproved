import type { RulesBundle } from '@mindset/rules-engine';
import starter from '../src/data/starter-bundle.json';
import { memoryKV } from '../src/core/kv';
import { createStore } from '../src/core/store';

export const shipped = starter as RulesBundle;

export function testStore() {
  let n = 0;
  return createStore(memoryKV(), () => `id-${++n}`);
}

export function bumped(version: number, mutate?: (b: RulesBundle) => void): RulesBundle {
  const b = JSON.parse(JSON.stringify(shipped)) as RulesBundle;
  b.version = version;
  mutate?.(b);
  return b;
}
