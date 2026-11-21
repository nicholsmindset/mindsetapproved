/**
 * Adds Chinese, Japanese, Korean and Malay names for existing rules from the Open Food Facts taxonomies.
 *   pnpm i18n:aliases --additives <additives.txt> --ingredients <food/ingredients.txt>
 * Only entries whose canonical English name (or E-number) is already one of our aliases are used, so every added
 * name is a translation of something the rules already know. Names that would collide with another rule are
 * skipped and listed. Writes `i18n_aliases` into data/starter-rules.json (data from OFF, ODbL).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileBundle, eCode, hasCJK, loadRules, normKey, rowsFromSource, type RuleSource } from '../../packages/rules-engine/src/index.ts';
import { parseTaxonomy, type TaxonomyEntry } from '../import-off-taxonomy/parse.ts';
import { arg, readStarter, ROOT } from '../lib.ts';

const LANGS = ['zh', 'ja', 'ko', 'ms'] as const;

/**
 * Generated names that are too broad on a label: bare "caramel" usually means the confection, not caramel colour,
 * and 调味剂 ("seasoning agent") would flag ordinary seasonings as flavourings. Curated names live in local_aliases.
 */
const EXCLUDE = new Set(['焦糖', 'キャラメル', 'カラメル', '캐러멜', 'karamel', '调味剂', '天然调味剂'].map(normKey));
type Lang = (typeof LANGS)[number];

export interface ExtractResult {
  added: Record<string, Partial<Record<Lang, string[]>>>;
  conflicts: Array<{ name: string; lang: string; wanted: string; existing: string }>;
}

function langOf(code: string): Lang | null {
  if (code === 'zh' || code.startsWith('zh_')) return 'zh';
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : null;
}

export function extract(src: RuleSource, entries: TaxonomyEntry[]): ExtractResult {
  const rules = loadRules(compileBundle({ ...rowsFromSource(src), generatedAt: 'i18n' }));
  const owner = new Map(rules.aliases); // key -> ingredient id, grows as we add
  const added: ExtractResult['added'] = {};
  const conflicts: ExtractResult['conflicts'] = [];

  for (const e of entries) {
    const en = e.names['en']?.[0];
    let id: string | undefined;
    if (en) id = rules.aliases.get(normKey(en)) ?? (eCode(en) ? rules.eNumbers.get(eCode(en)!) : undefined);
    if (!id && e.props['e_number']) id = rules.eNumbers.get(`e${normKey(e.props['e_number']).replace(/\s/g, '')}`);
    if (!id) continue;
    for (const [code, names] of Object.entries(e.names)) {
      const lang = langOf(code);
      if (!lang) continue;
      for (const name of names) {
        const key = normKey(name);
        if (!key || eCode(name) || EXCLUDE.has(key)) continue; // E-codes are already matched by number
        if (lang !== 'ms' && !hasCJK(key)) continue; // a Latin spelling in a CJK list adds nothing
        if (lang === 'ms' && key.length < 3) continue;
        const prev = owner.get(key);
        if (prev && prev !== id) {
          conflicts.push({ name, lang, wanted: id, existing: prev });
          continue;
        }
        if (prev === id) continue;
        owner.set(key, id);
        ((added[id] ??= {})[lang] ??= []).push(name.trim());
      }
    }
  }
  return { added, conflicts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = [arg('additives'), arg('ingredients')].filter(Boolean) as string[];
  if (!files.length) throw new Error('Pass --additives and/or --ingredients taxonomy files');
  const entries = files.flatMap((f) => parseTaxonomy(readFileSync(f, 'utf8')));
  const path = resolve(ROOT, 'data/starter-rules.json');
  const src = readStarter();
  // Re-generate from scratch so the step is repeatable.
  for (const ing of src.ingredients) delete ing.i18n_aliases;
  const { added, conflicts } = extract(src, entries);
  let total = 0;
  for (const ing of src.ingredients) {
    const a = added[ing.id];
    if (!a) continue;
    ing.i18n_aliases = Object.fromEntries(LANGS.filter((l) => a[l]?.length).map((l) => [l, a[l]!]));
    total += Object.values(ing.i18n_aliases).flat().length;
  }
  writeFileSync(path, `${JSON.stringify(src, null, 2)}\n`);
  const byLang = Object.fromEntries(LANGS.map((l) => [l, Object.values(added).reduce((n, a) => n + (a[l]?.length ?? 0), 0)]));
  console.log(`Added ${total} translated names to ${Object.keys(added).length} rules:`, byLang);
  console.log(`Skipped ${conflicts.length} names that would collide with another rule, e.g.:`);
  for (const c of conflicts.slice(0, 12)) console.log(`  ${c.lang} "${c.name}": ${c.wanted} vs existing ${c.existing}`);
}
