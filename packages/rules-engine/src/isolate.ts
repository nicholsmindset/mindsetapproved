import { cleanLabelText } from './normalize';

export interface IsolatedText {
  /** The ingredient list itself, without header, notes or trailing sections. */
  block: string;
  /** "May contain..." / facility statements. */
  notes: string[];
  headerFound: boolean;
}

const HEADER_COLON = /\b(?:ingredients?|ingredient list|ingr[ée]dients|bahan(?:-bahan)?|komposisi)\s*[:：]/i;
const HEADER_WORD = /\bingredients?\b/i;

const END_MARKERS = new RegExp(
  [
    String.raw`\bnutrition(?:al)?\s+(?:facts|information|info|panel)\b`,
    String.raw`\bnutrition\s*:`,
    String.raw`\ballergens?\b`,
    String.raw`\bcontains\s*:`,
    String.raw`[.!]\s*contains\b(?!\s+(?:less|\d|one|1\b))`,
    String.raw`\bstorage\b`,
    String.raw`\bstore (?:in|at|below|under)\b`,
    String.raw`\bbest (?:before|by)\b`,
    String.raw`\buse by\b`,
    String.raw`\bexpiry\b`,
    String.raw`\bkeep (?:refrigerated|frozen|in a cool)\b`,
    String.raw`\brefrigerate after opening\b`,
    String.raw`\b(?:manufactured|distributed|produced|packed|imported|marketed) (?:by|for)\b`,
    String.raw`\bnet (?:wt|weight|vol|volume|contents?)\b`,
    String.raw`\bproduct of\b`,
    String.raw`\bmade in (?!a\b|an\b|the same\b|our\b)`,
    String.raw`\bserving size\b`,
    String.raw`\bdirections\b`,
    // a second ingredient list in another language (bilingual Canadian, EU and Nordic packs)
    String.raw`\b(?:ingr[ée]dients|ingredientes|ingredienti|zutaten|ingredienser|ingrediënten|ainesosat|sk[łl]adniki)\s*[:：]`,
  ].join('|'),
  'i',
);

const NOTE_RE =
  /\b(?:may (?:also )?contain|traces? of|(?:made|manufactured|produced|processed|packed|prepared|packaged) (?:in|on) (?:a |the same )?(?:facility|factory|equipment|premises|plant|line|site)|produced in a factory)[^.]*\.?/gi;

/** Finds the ingredient block inside OCR text or a database ingredients_text. */
export function isolateIngredients(raw: string): IsolatedText {
  let text = cleanLabelText(raw);
  let headerFound = false;
  const m = HEADER_COLON.exec(text) ?? HEADER_WORD.exec(text);
  if (m) {
    headerFound = true;
    text = text.slice(m.index + m[0].length);
  }

  const notes: string[] = [];
  text = text.replace(NOTE_RE, (n) => {
    notes.push(n.replace(/[.\s]+$/, '').trim());
    return ' , ';
  });

  const end = END_MARKERS.exec(text);
  if (end) text = text.slice(0, end.index + (end[0].startsWith('.') || end[0].startsWith('!') ? 1 : 0));

  const block = text
    // a sentence break is a separator, except in "No. 40" and abbreviations like "L. bulgaricus"
    .replace(/(?<!\b(?:no|[a-z]))\.(?=\s|$)/gi, ',')
    .replace(/^[\s:,.\-–]+/, '')
    .replace(/[\s,.]+$/, '')
    .replace(/\s*,\s*(?:,\s*)+/g, ', ')
    .trim();

  return { block, notes, headerFound };
}
