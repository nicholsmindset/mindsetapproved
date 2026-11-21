/**
 * One-off importer for OFF taxonomy synonyms.
 *   pnpm off:import --file additives.txt [--langs en,fr] [--out supabase/off-additives.sql]
 *   pnpm off:import --url <raw taxonomy URL> ...
 * Taxonomy files live in the openfoodfacts/openfoodfacts-server repository:
 *   https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/additives.txt
 *   https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/food/ingredients.txt
 * (fetch through the HTTPS proxy with NODE_USE_ENV_PROXY=1 where one is required).
 * Entries whose names already match a starter rule are skipped.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileBundle, loadRules, rowsFromSource } from '../../packages/rules-engine/src/index.ts';
import { arg, readStarter, ROOT } from '../lib.ts';
import { parseTaxonomy } from './parse.ts';
import { planImport, planToSql } from './sql.ts';

async function main() {
  const file = arg('file');
  const url = arg('url');
  if (!file && !url) throw new Error('Pass --file <path> or --url <url>');
  let text: string;
  if (file) text = readFileSync(file, 'utf8');
  else {
    const res = await fetch(url!);
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
    text = await res.text();
  }
  const langs = (arg('langs') ?? 'en').split(',');
  const known = loadRules(compileBundle(rowsFromSource(readStarter())));
  const plan = planImport(parseTaxonomy(text), { langs, known });
  const out = resolve(ROOT, arg('out') ?? 'supabase/off-import.sql');
  writeFileSync(out, planToSql(plan, file ?? url!));
  const aliasCount = plan.entries.reduce((n, e) => n + e.aliases.length, 0);
  console.log(`${plan.entries.length} entries, ${aliasCount} aliases (${plan.skippedKnown} already covered by starter rules) -> ${out}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
