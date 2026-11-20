import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RuleSource } from '../packages/rules-engine/src/index.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function readStarter(path = resolve(ROOT, 'data/starter-rules.json')): RuleSource {
  return JSON.parse(readFileSync(path, 'utf8')) as RuleSource;
}

/** SQL string literal. */
export function lit(v: string | null | undefined): string {
  if (v === null || v === undefined) return 'null';
  return `'${v.replace(/'/g, "''")}'`;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
