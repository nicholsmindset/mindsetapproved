/**
 * Parser for Open Food Facts taxonomy files (additives.txt, ingredients.txt).
 *
 * Format: entries separated by blank lines.
 *   <en:parent                 parent link
 *   en:E129, Allura Red AC     synonyms for a language (first one is the canonical name)
 *   e_number:en: 129           property lines (prop:lang: value)
 *   # comment
 * Header blocks starting with "stopwords:" or "synonyms:" are skipped.
 */
export interface TaxonomyEntry {
  /** Canonical tag, e.g. "en:e129". */
  tag: string;
  parents: string[];
  names: Record<string, string[]>;
  props: Record<string, string>;
}

const LANG_LINE = /^([a-z]{2}(?:_[a-z]{2})?):\s*(.+)$/;
const PROP_LINE = /^([a-z_0-9]+):([a-z]{2}(?:_[a-z]{2})?):\s*(.*)$/;

export function tagOf(lang: string, name: string): string {
  return `${lang}:${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

export function parseTaxonomy(text: string): TaxonomyEntry[] {
  const entries: TaxonomyEntry[] = [];
  for (const block of text.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (!lines.length) continue;
    if (/^(stopwords|synonyms):/.test(lines[0]!)) continue;

    const entry: TaxonomyEntry = { tag: '', parents: [], names: {}, props: {} };
    for (const line of lines) {
      if (line.startsWith('<')) {
        entry.parents.push(line.slice(1).trim().toLowerCase());
        continue;
      }
      const prop = PROP_LINE.exec(line);
      if (prop) {
        entry.props[prop[1]!] = prop[3]!.trim();
        continue;
      }
      const lang = LANG_LINE.exec(line);
      if (lang) {
        const names = lang[2]!
          .split(/(?<!\\),/)
          .map((n) => n.replace(/\\,/g, ',').trim())
          .filter(Boolean);
        if (!names.length) continue;
        (entry.names[lang[1]!] ??= []).push(...names);
        if (!entry.tag) entry.tag = tagOf(lang[1]!, names[0]!);
      }
    }
    if (entry.tag) entries.push(entry);
  }
  return entries;
}
