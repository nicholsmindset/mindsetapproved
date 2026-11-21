/**
 * Canonical normal form for aliases and label text. The same function builds
 * alias keys at compile time and lookup keys at scan time, so they always agree.
 * "FD&C Red No. 40" -> "fd c red no 40"; "Glucose-Fructose Syrup" -> "glucose fructose syrup".
 */
/** Letters NFKD can't decompose, transliterated the way Postgres unaccent() does, so both sides agree. */
const TRANSLIT: Record<string, string> = { ø: 'o', Ø: 'O', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', ß: 'ss', ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', þ: 'th', Þ: 'TH', ı: 'i' };

/**
 * Scripts kept besides a-z/0-9: Japanese kana, CJK ideographs and Korean Hangul. The same explicit set is used by
 * Postgres norm_key(), so both sides agree regardless of the database locale. Other scripts become spaces.
 */
export const CJK_RANGES = '\\u3040-\\u30fa\\u30fc-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af\\uf900-\\ufaff';
const NOT_KEPT = new RegExp(`[^a-z0-9${CJK_RANGES}]+`, 'g');
const CJK_CHAR = new RegExp(`[${CJK_RANGES}]`);

/** True when the text contains CJK or Hangul, which is matched by substring (no spaces between words). */
export function hasCJK(s: string): boolean {
  return CJK_CHAR.test(s);
}

export function normKey(input: string): string {
  return input
    .replace(/[øØæÆœŒßłŁđĐþÞı]/g, (ch) => TRANSLIT[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC') // recompose Hangul syllables and kana after stripping Latin accents
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(NOT_KEPT, ' ')
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
const ENTITIES: Record<string, string> = { quot: '"', amp: '&', apos: "'", '#39': "'", lt: '<', gt: '>', nbsp: ' ' };

export function cleanLabelText(raw: string): string {
  return raw
    .replace(/&(quot|amp|apos|#39|lt|gt|nbsp);/g, (_m, e: string) => ENTITIES[e] ?? ' ')
    .normalize('NFKC')
    // CJK list punctuation: 、 and ・ separate items, 。 ends a sentence, lenticular brackets act as brackets
    .replace(/[、・､]/g, ',')
    .replace(/[。｡]/g, '. ')
    .replace(/[【〔〘]/g, '[')
    .replace(/[】〕〙]/g, ']')
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
  // allergen typography notes: "allergens in bold", "for allergens see ingredients in bold"
  /\b(?:for allergens,?\s+)?(?:see\s+)?(?:allergens?|ingredients)\s+(?:are\s+)?(?:in|shown in|listed in)\s+(?:bold|capitals|underlined)\b/gi,
  /\bin bold\b/gi,
];

const EXPELLER = /\bexpell?er[- ]pressed\b/gi;
/** "non-hydrogenated vegetable oil" is vegetable oil, not hydrogenated oil. */
const NON_HYDROGENATED = /\b(?:non[- ]?|un|not\s+)hydrogenated\b/gi;
/** "fully hydrogenated" fats are not the trans-fat source "partially hydrogenated" refers to; judge the oil itself. */
const FULLY_HYDROGENATED = /\b(?:fully|completely)[- ]hydrogenated\b/gi;

/** Removes filler words; returns flags for meaningful ones kept as metadata. */
export function stripFiller(text: string): { text: string; flags: string[] } {
  const flags: string[] = [];
  let t = text;
  if (EXPELLER.test(t)) {
    flags.push('expeller_pressed');
    t = t.replace(EXPELLER, ' ');
  }
  EXPELLER.lastIndex = 0;
  if (NON_HYDROGENATED.test(t)) {
    flags.push('non_hydrogenated');
    t = t.replace(NON_HYDROGENATED, ' ');
  }
  NON_HYDROGENATED.lastIndex = 0;
  if (FULLY_HYDROGENATED.test(t)) {
    flags.push('fully_hydrogenated');
    t = t.replace(FULLY_HYDROGENATED, ' ');
  }
  FULLY_HYDROGENATED.lastIndex = 0;
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

const UNIT_OR_FILLER = new Set(['mg', 'g', 'kg', 'ml', 'l', 'mcg', 'ug', 'iu', 'kcal', 'kj', 'per', 'of', 'ph', 'min', 'max', 'approx', 'approximately', 'less', 'than', 'more', 'per100g', 'serving']);

/** True for leftovers that aren't ingredients: amounts, units and qualifiers ("2 mg l", "180 g per 100 g", "min"). */
export function isNoiseKey(key: string): boolean {
  if (!key) return true;
  const tokens = key.split(' ');
  const hasUnit = tokens.some((t) => UNIT_OR_FILLER.has(t) || /^\d+(?:mg|g|ml|kg|l|mcg)$/.test(t));
  return tokens.every((t) => {
    // a 3-4 digit number with no unit next to it may be an E/INS code ("e 102", "471")
    if (/^\d{3,4}[a-z]?$/.test(t)) return hasUnit;
    // a single CJK character is a word ("盐" is salt); a single Latin letter is debris
    return /^\d+[a-z]{0,3}$/.test(t) || UNIT_OR_FILLER.has(t) || (t.length === 1 && !hasCJK(t));
  });
}
