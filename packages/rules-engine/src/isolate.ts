import { cleanLabelText } from './normalize';

export interface IsolatedText {
  /** The ingredient list itself, without header, notes or trailing sections. */
  block: string;
  /** "May contain..." / facility statements. */
  notes: string[];
  headerFound: boolean;
}

const HEADER_COLON =
  /(?:\b(?:ingredients?|ingredient list|ingr[ée]dients|bahan(?:-bahan)?|ramuan|komposisi)|配料表?|原材料名?|原料|(?<!营养|營養|栄養)成分|원재료명?|원료명?|재료명)\s*[:：]/i;
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
    // a second ingredient list in another language (bilingual Canadian, EU, Nordic and Asian packs)
    String.raw`\b(?:ingr[ée]dients|ingredientes|ingredienti|zutaten|ingredienser|ingrediënten|ainesosat|sk[łl]adniki|ingredients?|bahan(?:-bahan)?|ramuan)\s*[:：]`,
    String.raw`(?:配料表?|原材料名?|原料|원재료명?|원료명?)\s*[:：]`,
    // CJK and Malay section headings: nutrition, storage, shelf life, allergens, net content, maker, origin
    String.raw`营养成分|營養成分|營養標示|保质期|保存期限|貯存|贮存|储存|储藏|生产日期|生產日期|致敏|过敏原|過敏原|净含量|淨含量|产地|產地|生产商|製造商|制造商|内容量|賞味期限|消費期限|保存方法|栄養成分|영양정보|영양성분|보관방법|알레르기|내용량|유통기한|소비기한|제조원|제조사`,
    String.raw`\bmaklumat pemakanan\b|\btarikh luput\b|\bsimpan di\b|\bdibuat di\b|\bmengandungi\s*:`,
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
