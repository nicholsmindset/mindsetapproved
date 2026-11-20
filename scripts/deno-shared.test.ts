import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDenoShared, SHARED } from './build-deno-shared.ts';

describe('supabase/functions/_shared', () => {
  it('is up to date with packages/rules-engine (run pnpm deno:shared)', async () => {
    const { engine, fixtures } = await buildDenoShared();
    expect(readFileSync(resolve(SHARED, 'rules-engine.js'), 'utf8')).toBe(engine);
    expect(readFileSync(resolve(SHARED, 'fixtures.json'), 'utf8')).toBe(fixtures);
  });
  it('the bundled engine runs and publishes', async () => {
    const mod = await import(resolve(SHARED, 'rules-engine.js'));
    const fx = JSON.parse(readFileSync(resolve(SHARED, 'fixtures.json'), 'utf8'));
    const src = JSON.parse(readFileSync(resolve(SHARED, '../../../data/starter-rules.json'), 'utf8'));
    const plan = mod.preparePublish({ draft: mod.rowsFromSource(src), previous: null, fixtures: fx });
    expect(plan.failures).toEqual([]);
    expect(plan.bundle.version).toBe(1);
  });
});
