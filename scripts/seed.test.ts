import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSeedSql } from './build-seed.ts';
import { buildBundle } from './compile-bundle.ts';
import { readStarter, ROOT } from './lib.ts';

describe('generated files', () => {
  it('supabase/seed.sql is up to date with data/starter-rules.json (run pnpm seed:build)', () => {
    expect(readFileSync(resolve(ROOT, 'supabase/seed.sql'), 'utf8')).toBe(buildSeedSql(readStarter()));
  });
  it('escapes quotes in SQL literals', () => {
    expect(buildSeedSql(readStarter())).toContain(`'"Vegetable oil" doesn''t say which oil is used`);
  });
  it('builds a bundle from an export_rules() payload', () => {
    const b = buildBundle({});
    expect(b.version).toBe(1);
    expect(Object.keys(b.eNumbers)).toContain('e129');
  });
});
