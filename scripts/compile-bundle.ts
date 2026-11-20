/**
 * Compiles a versioned rules bundle (JSON + gzip).
 *   pnpm bundle:build                                  # from data/starter-rules.json
 *   pnpm bundle:build --from-export export.json --version 12 --out dist
 * `export.json` is the output of the export_rules() RPC. The future publish-bundle Edge Function
 * runs the same compileBundle() before uploading to the rules-bundles bucket.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { compileBundle, rowsFromSource, type CompileInput, type RulesBundle } from '../packages/rules-engine/src/index.ts';
import { arg, readStarter, ROOT } from './lib.ts';

export function buildBundle(opts: { fromExport?: string; version?: number }): RulesBundle {
  if (opts.fromExport) {
    const exp = JSON.parse(readFileSync(opts.fromExport, 'utf8')) as Omit<CompileInput, 'version'>;
    if (!opts.version) throw new Error('--version is required with --from-export');
    return compileBundle({ ...exp, version: opts.version });
  }
  const src = readStarter();
  return compileBundle({ ...rowsFromSource(src), version: opts.version ?? src.version });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = arg('version') ? Number(arg('version')) : undefined;
  const bundle = buildBundle({ fromExport: arg('from-export'), version });
  const outDir = resolve(ROOT, arg('out') ?? 'dist');
  mkdirSync(outDir, { recursive: true });
  const json = JSON.stringify(bundle);
  const gz = gzipSync(json, { level: 9 });
  const base = resolve(outDir, `rules-bundle.v${bundle.version}`);
  writeFileSync(`${base}.json`, json);
  writeFileSync(`${base}.json.gz`, gz);
  console.log(
    `Rules bundle v${bundle.version}: ${bundle.ingredients.length} ingredients, ` +
      `${Object.keys(bundle.aliases).length} aliases, ${Object.keys(bundle.eNumbers).length} E-numbers; ` +
      `${(json.length / 1024).toFixed(1)} KB JSON, ${(gz.length / 1024).toFixed(1)} KB gzipped -> ${base}.json(.gz)`,
  );
}
