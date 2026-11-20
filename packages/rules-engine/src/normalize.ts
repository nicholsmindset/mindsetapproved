/**
 * Canonical normal form for aliases and label text. The same function builds
 * alias keys at compile time and lookup keys at scan time, so they always agree.
 * "FD&C Red No. 40" -> "fd c red no 40"; "Glucose-Fructose Syrup" -> "glucose fructose syrup".
 */
export function normKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Plural/singular variants of the last word, for lookup fallback. */
export function pluralVariants(key: string): string[] {
  const i = key.lastIndexOf(' ');
  const head = i === -1 ? '' : key.slice(0, i + 1);
  const w = i === -1 ? key : key.slice(i + 1);
  const out: string[] = [];
  if (w.length > 3) {
    if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
    if (/(s|x|ch|sh|o)es$/.test(w)) out.push(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
  }
  return out.map((v) => head + v);
}

/** First pass on raw OCR/database text: join hyphenated line breaks, flatten lines, unify separators. */
export function cleanLabelText(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/(\w)-[ \t]*\r?\n[ \t]*(\w)/g, '$1$2')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[;·•|]/g, ',')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const FILLER: RegExp[] = [
  /\b(?:contains?\s+)?(?:less than\s+)?\d+(?:\.\d+)?\s?%\s+(?:or less\s+)?of\s*(?:the following\s*)?:?/gi,
  /\bcontains? (?:one or more|1 or more) of (?:the following)?\s*:?/gi,
  /\b(?:one or more|1 or more) of (?:the following)?\s*:?/gi,
  /\b(?:certified\s+)?organic\b/gi,
  /\bnon[- ]?gmo\b/gi,
  /\bcold[- ]pressed\b/gi,
];

const EXPELLER = /\bexpell?er[- ]pressed\b/gi;

/** Removes filler words; returns flags for meaningful ones kept as metadata. */
export function stripFiller(text: string): { text: string; flags: string[] } {
  const flags: string[] = [];
  let t = text;
  if (EXPELLER.test(t)) {
    flags.push('expeller_pressed');
    t = t.replace(EXPELLER, ' ');
  }
  EXPELLER.lastIndex = 0;
  for (const re of FILLER) t = t.replace(re, ' ');
  return { text: t.replace(/\s+/g, ' ').trim(), flags };
}

/** "sugar 12%", "cocoa (25%)", "12.5% milk" -> percentages removed. */
export function stripPercent(text: string): string {
  return text
    .replace(/[([]\s*\d+(?:[.,]\d+)?\s?%\s*[)\]]/g, ' ')
    .replace(/\d+(?:[.,]\d+)?\s?%/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
