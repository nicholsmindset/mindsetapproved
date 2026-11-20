import { describe, expect, it } from 'vitest';
import { compileBundle, loadRules, rowsFromSource } from '../../packages/rules-engine/src/index.ts';
import { readStarter } from '../lib.ts';
import { parseTaxonomy } from './parse.ts';
import { offIngredientId, planImport, planToSql } from './sql.ts';

const SAMPLE = `
# Additives taxonomy (sample)
stopwords:en: the, of

en:E129, Allura Red AC, FD&C Red 40
fr:E129, Rouge allura AC
e_number:en: 129
vegan:en: yes

<en:E440
en:E440i, Pectin
e_number:en: 440i

en:E471, Mono- and diglycerides of fatty acids, mono and diglycerides
fr:E471, Mono- et diglycérides d'acides gras
e_number:en: 471

en:E1442, Hydroxy propyl distarch phosphate
e_number:en: 1442

en:Sea buckthorn oil\\, cold pressed, sea buckthorn oil
`;

describe('parseTaxonomy', () => {
  const entries = parseTaxonomy(SAMPLE);
  it('parses entries and skips headers', () => expect(entries.map((e) => e.tag)).toEqual(['en:e129', 'en:e440i', 'en:e471', 'en:e1442', 'en:sea-buckthorn-oil,-cold-pressed']));
  it('collects names per language', () => {
    expect(entries[0]!.names['en']).toEqual(['E129', 'Allura Red AC', 'FD&C Red 40']);
    expect(entries[0]!.names['fr']).toEqual(['E129', 'Rouge allura AC']);
  });
  it('reads properties', () => expect(entries[0]!.props).toMatchObject({ e_number: '129', vegan: 'yes' }));
  it('reads parents', () => expect(entries[1]!.parents).toEqual(['en:e440']));
  it('handles escaped commas', () => expect(entries[4]!.names['en']).toEqual(['Sea buckthorn oil, cold pressed', 'sea buckthorn oil']));
});

describe('planImport', () => {
  const known = loadRules(compileBundle(rowsFromSource(readStarter())));
  const plan = planImport(parseTaxonomy(SAMPLE), { langs: ['en'], known });
  it('skips entries the starter rules already cover', () => {
    expect(plan.skippedKnown).toBe(2); // E129 (Red 40) and E440 (pectin)
    expect(plan.entries.map((e) => e.tag)).toEqual(['en:e471', 'en:e1442', 'en:sea-buckthorn-oil,-cold-pressed']);
  });
  it('turns E-code names into e_number aliases', () => {
    const e471 = plan.entries.find((e) => e.tag === 'en:e471')!;
    expect(e471.aliases).toContainEqual({ alias: 'E471', lang: 'en', kind: 'e_number' });
    expect(e471.aliases).toContainEqual({ alias: 'mono and diglycerides', lang: 'en', kind: 'name' });
  });
  it('makes stable ids', () => expect(offIngredientId('en:e471')).toBe('off_en_e471'));
  it('emits inactive SQL with the ODbL notice', () => {
    const sql = planToSql(plan, 'sample');
    expect(sql).toContain('Open Database License');
    expect(sql).toContain("'unreviewed', 'en:e471', false");
    expect(sql).toContain("on conflict (alias_norm) do nothing");
  });
});
