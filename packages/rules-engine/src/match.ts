import { eCode, type Rules } from './bundle';
import { fuzzyLookup } from './fuzzy';
import { hasCJK, isNoiseKey, normKey, pluralVariants, stripFiller, stripPercent } from './normalize';
import type { RawItem } from './split';
import type { IngredientMatch, ParsedItem } from './types';

/** Head nouns that a bare list member borrows from its parent or list: "vegetable oil (canola, soybean)". */
const HEADS = new Set([
  'oil', 'oils', 'fat', 'fats', 'shortening', 'syrup', 'gum', 'gums',
  'flavor', 'flavors', 'flavour', 'flavours', 'flavoring', 'flavorings', 'flavouring', 'flavourings',
  'color', 'colors', 'colour', 'colours',
]);

/** Additive class labels used on EU / Codex / Singapore labels: "Colour (E129)", "Emulsifier: soy lecithin". */
const CLASS_NAMES = new Set(
  [
    'color', 'colour', 'colors', 'colours', 'coloring', 'colouring', 'food coloring', 'food colouring', 'colour added', 'color added',
    'preservative', 'preservatives', 'emulsifier', 'emulsifiers', 'stabiliser', 'stabilisers', 'stabilizer', 'stabilizers',
    'thickener', 'thickeners', 'thickening agent', 'antioxidant', 'antioxidants', 'acidity regulator', 'acidity regulators',
    'acidulant', 'food acid', 'food acids', 'flavour enhancer', 'flavour enhancers', 'flavor enhancer', 'flavor enhancers',
    'sweetener', 'sweeteners', 'raising agent', 'raising agents', 'leavening agent', 'leavening agents', 'humectant',
    'humectants', 'firming agent', 'gelling agent', 'gelling agents', 'anti caking agent', 'anticaking agent',
    'glazing agent', 'glazing agents', 'emulsifying salt', 'emulsifying salts', 'flour treatment agent', 'modified starch',
    'seasoning', 'seasonings', 'spices',
    // Chinese
    '着色剂', '色素', '食用色素', '防腐剂', '乳化剂', '稳定剂', '增稠剂', '稳定剂和增稠剂', '酸度调节剂', '增味剂', '甜味剂',
    '膨松剂', '抗氧化剂', '食品添加剂', '水分保持剂', '凝固剂', '被膜剂', '抗结剂', '调味料', '香辛料', '着色劑', '防腐劑',
    '乳化劑', '穩定劑', '增稠劑', '酸度調節劑', '甜味劑', '膨鬆劑', '抗氧化劑', '食品添加物',
    // Japanese
    '着色料', '保存料', '乳化剤', '増粘剤', '安定剤', '増粘安定剤', 'ゲル化剤', '酸味料', '調味料', '甘味料', '膨張剤',
    '酸化防止剤', 'ｐｈ調整剤', 'ph調整剤', '光沢剤', '香辛料抽出物',
    // Korean
    '착색료', '보존료', '유화제', '안정제', '증점제', '산도조절제', '향미증진제', '감미료', '팽창제', '산화방지제', '식품첨가물',
    // Malay
    'pewarna', 'pewarna makanan', 'pengawet', 'pengemulsi', 'penstabil', 'pemekat', 'pengatur keasidan', 'penambah perisa',
    'pemanis', 'agen penaik', 'antioksidan', 'bahan tambah makanan',
  ].map(normKey),
);

const CONJ = / (?:and or|or|and) /;
const FLAVOR_END = /\bflavou?r(?:ing)?s?$/;
const GENERIC_FLAVOR = new Set(['flavor', 'flavour', 'flavoring', 'flavouring']);

interface Ctx {
  /** Head noun of the parent item ("oil" in "vegetable oil (canola, soybean)"). */
  parentHead: string | null;
  /** Head nouns borrowed from an alternative list ("canola, soybean or sunflower oil"). */
  siblingHeads: string[];
  parentIsClass: boolean;
}

interface ScanResult {
  matches: IngredientMatch[];
  unknownCodes: string[];
  /** Covered by its parent ("butter" in "Flavour (butter, vanilla)"): not unmatched. */
  absorbed?: boolean;
}

function lookupPhrase(key: string, rules: Rules): { id: string; alias: string } | null {
  const id = rules.aliases.get(key);
  if (id) return { id, alias: key };
  for (const v of pluralVariants(key)) {
    const vid = rules.aliases.get(v);
    if (vid) return { id: vid, alias: v };
  }
  return null;
}

function lookupCode(code: string, rules: Rules): string | null {
  return rules.eNumbers.get(code) ?? rules.eNumbers.get(code.replace(/[a-z]$/, '')) ?? null;
}

/**
 * CJK/Hangul text has no spaces between words: scan a token for the longest known aliases ("白砂糖" contains
 * "砂糖"). Single-character aliases ("盐" salt, "油" oil) only match a whole token, never inside a longer word.
 */
function cjkScan(token: string, rules: Rules, kind: IngredientMatch['kind']): IngredientMatch[] {
  const whole = rules.aliases.get(token);
  if (whole) return [{ ingredientId: whole, matched: token, kind, possible: false }];
  const chars = [...token];
  const out: IngredientMatch[] = [];
  let i = 0;
  outer: while (i < chars.length) {
    for (let len = Math.min(rules.maxCjkLen, chars.length - i); len >= 2; len--) {
      const sub = chars.slice(i, i + len).join('');
      const id = rules.aliases.get(sub);
      if (id) {
        out.push({ ingredientId: id, matched: sub, kind, possible: false });
        i += len;
        continue outer;
      }
    }
    i++;
  }
  return out;
}

/** Longest-first n-gram scan over the tokens of one item, plus E/INS codes. */
function scan(key: string, rules: Rules, kind: IngredientMatch['kind'] = 'alias', allowBare = false): ScanResult {
  const tokens = key.split(' ').filter(Boolean);
  const matches: IngredientMatch[] = [];
  const unknownCodes: string[] = [];
  let i = 0;
  outer: while (i < tokens.length) {
    // E-number pass: "e129", "e 129", "ins 129", "ins no 129", "e150 d"
    const t = tokens[i]!;
    if (hasCJK(t)) {
      // Spaced names first ("적색 40호", "黄色 4号"): try the longest run of tokens, spaced or joined.
      for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
        const run = tokens.slice(i, i + n);
        const id = rules.aliases.get(run.join(' ')) ?? rules.aliases.get(run.join(''));
        if (id) {
          matches.push({ ingredientId: id, matched: run.join(' '), kind, possible: false });
          i += n;
          continue outer;
        }
      }
      matches.push(...cjkScan(t, rules, kind));
      i++;
      continue;
    }
    let codeLen = 0;
    let code: string | null = null;
    if (/^(?:e|ins)\d{3,4}[a-z]*$/.test(t)) {
      code = eCode(t);
      codeLen = 1;
    } else if (allowBare && /^\d{3,4}[a-z]*$/.test(t)) {
      // "Emulsifier (322 from soy)": bare INS numbers under an additive class label
      code = eCode(`e${t}`);
      codeLen = 1;
    } else if ((t === 'e' || t === 'ins') && i + 1 < tokens.length) {
      const skipNo = tokens[i + 1] === 'no' ? 1 : 0;
      const num = tokens[i + 1 + skipNo];
      if (num && /^\d{3,4}[a-z]*$/.test(num)) {
        code = eCode(`e${num}`);
        codeLen = 2 + skipNo;
      }
    }
    if (code) {
      const c = code;
      const id = lookupCode(c, rules);
      if (id) matches.push({ ingredientId: id, matched: c, kind: 'e_number', possible: false });
      else unknownCodes.push(c);
      i += codeLen;
      continue;
    }
    for (let len = Math.min(rules.maxAliasWords, tokens.length - i); len >= 1; len--) {
      const hit = lookupPhrase(tokens.slice(i, i + len).join(' '), rules);
      if (hit) {
        matches.push({ ingredientId: hit.id, matched: hit.alias, kind, possible: false });
        i += len;
        continue outer;
      }
    }
    i++;
  }
  return { matches, unknownCodes };
}

function ocrVariants(key: string): string[] {
  const tokens = key.split(' ');
  const mixed = (tok: string) => /[a-z]/.test(tok) && /\d/.test(tok) && !/^e\d/.test(tok);
  const digitsTo = (map: Record<string, string>) =>
    tokens.map((tok) => (mixed(tok) ? tok.replace(/[0158]/g, (d) => map[d] ?? d) : tok)).join(' ');
  const v1 = digitsTo({ '0': 'o', '1': 'l', '5': 's', '8': 'b' });
  const v2 = digitsTo({ '0': 'o', '1': 'i', '5': 's', '8': 'b' });
  const out = [v1, v2, key.replace(/rn/g, 'm'), v1.replace(/rn/g, 'm'), key.replace(/m/g, 'rn'), key.replace(/vv/g, 'w'), key.replace(/cl/g, 'd')];
  return [...new Set(out)].filter((v) => v !== key);
}

function dedupe(matches: IngredientMatch[]): IngredientMatch[] {
  const seen = new Map<string, IngredientMatch>();
  for (const m of matches) {
    const prev = seen.get(m.ingredientId);
    if (!prev || (prev.possible && !m.possible)) seen.set(m.ingredientId, m);
  }
  return [...seen.values()];
}

function matchKey(key: string, ctx: Ctx, rules: Rules): ScanResult {
  // 1. borrow a head noun from the parent or the alternative list: "canola" -> "canola oil"
  const heads = ctx.parentHead ? [ctx.parentHead, ...ctx.siblingHeads] : ctx.siblingHeads;
  for (const head of heads) {
    if (key.endsWith(` ${head}`) || key === head) continue;
    const hit = lookupPhrase(`${key} ${head}`, rules);
    if (hit) return { matches: [{ ingredientId: hit.id, matched: hit.alias, kind: 'alias', possible: false }], unknownCodes: [] };
  }
  // "Flavour (butter, vanilla)": "butter" here is a flavouring the parent already covers, not butter
  if (ctx.parentHead && FLAVOR_END.test(ctx.parentHead) && !FLAVOR_END.test(key)) {
    const r = matchKey(`${key} ${ctx.parentHead}`, { parentHead: null, siblingHeads: [], parentIsClass: false }, rules);
    r.matches = r.matches.filter((m) => !GENERIC_FLAVOR.has(m.matched));
    return { ...r, absorbed: true };
  }

  // 2. n-gram scan of the whole item
  const res = scan(key, rules, 'alias', ctx.parentIsClass);

  // 3. "natural and artificial flavors", "canola and/or soybean oil"
  if (CONJ.test(key)) {
    const parts = key.split(CONJ);
    const lastWord = parts[parts.length - 1]!.split(' ').pop()!;
    const heads = HEADS.has(lastWord) ? [lastWord] : ctx.parentHead ? [ctx.parentHead] : [];
    for (const part of parts) {
      // "rapeseed and soybean" under an oils parent: the head noun wins over the bare word ("soybean" the food)
      let hit: { id: string; alias: string } | null = null;
      for (const h of heads) {
        if (part.endsWith(` ${h}`)) break;
        hit = lookupPhrase(`${part} ${h}`, rules);
        if (hit) break;
      }
      if (hit) res.matches.push({ ingredientId: hit.id, matched: hit.alias, kind: 'alias', possible: false });
      else res.matches.push(...scan(part, rules).matches);
    }
    // the whole-item scan may have matched a part as a bare word; drop what the head-noun reading replaced
    res.matches = res.matches.filter(
      (m, i, all) => !(rules.byId.get(m.ingredientId)?.category === 'basic' && all.some((o) => o !== m && o.matched.startsWith(`${m.matched} `))),
    );
  }

  // 4. "butter flavor" is a flavouring, not butter; "artificial strawberry flavour" is artificial
  if (FLAVOR_END.test(key)) {
    const isFlavor = (m: IngredientMatch) => rules.byId.get(m.ingredientId)?.category === 'flavor';
    const art = lookupPhrase('artificial flavor', rules);
    const tokens = new Set(key.split(' '));
    let ms = res.matches.filter(isFlavor);
    if (art && (tokens.has('artificial') || (tokens.has('identical') && tokens.has('nature')))) {
      if (!tokens.has('natural')) ms = ms.filter((m) => !GENERIC_FLAVOR.has(m.matched));
      if (!ms.some((m) => m.ingredientId === art.id)) ms.push({ ingredientId: art.id, matched: art.alias, kind: 'inferred', possible: false });
    }
    if (ms.length) res.matches = ms;
  }

  res.matches = dedupe(res.matches);
  return res;
}

export interface MatchOutput {
  items: ParsedItem[];
  unmatched: string[];
}

/** Matches every item (parents and children) against the rules. Returns items in reading order. */
export function matchItems(raw: RawItem[], rules: Rules): MatchOutput {
  const items: ParsedItem[] = [];
  const unmatched: string[] = [];

  function walk(list: RawItem[], prefix: string, depth: number, parentCtx: { head: string | null; isClass: boolean }) {
    const keys = list.map((it) => normKey(stripPercent(stripFiller(it.name).text)));
    list.forEach((it, idx) => {
      const position = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      const { text: noFiller, flags } = stripFiller(it.name);
      let name = stripPercent(noFiller);

      // "Emulsifier: soy lecithin" -> "soy lecithin"
      let classPrefix = false;
      const colon = /^([^:]+):\s*(.+)$/.exec(name);
      if (colon && CLASS_NAMES.has(normKey(colon[1]!))) {
        name = colon[2]!;
        classPrefix = true;
      }
      let key = normKey(name);
      const isClass = !classPrefix && CLASS_NAMES.has(key);

      // "Colour (102, 110)" -> E102, E110
      if ((parentCtx.isClass || classPrefix) && /^\d{3,4}[a-z]*$/.test(key)) key = eCode(`e${key}`) ?? key;
      // A bare number elsewhere is only taken as an INS code when that code is a known rule ("471", "1422").
      else if (/^\d{3,4}\s?[a-f]?(?:\s?(?:i{1,3}|iv|vi?))?$/.test(key)) {
        const code = eCode(`e${key.replace(/\s/g, '')}`);
        if (code && (rules.eNumbers.has(code) || rules.eNumbers.has(code.replace(/[a-z]$/, '')))) key = code;
      }

      const heads: string[] = [];
      const wordCount = key.split(' ').length;
      if (wordCount <= 2 && it.children.length === 0) {
        for (let j = idx + 1; j < Math.min(list.length, idx + 5); j++) {
          const sib = list[j]!;
          const sk = keys[j]!;
          if (sib.orPrefix || CONJ.test(sk)) {
            const h = sk.split(' ').pop()!;
            if (HEADS.has(h)) heads.push(h);
            break;
          }
          if (sk.split(' ').length > 2 || sib.children.length) break;
        }
      }

      // e.g. "(60%)", or OCR/markup leftovers such as a lone "l" or "2"
      if (it.children.length === 0 && isNoiseKey(key)) return;

      const item: ParsedItem = {
        text: it.name,
        key,
        position,
        depth,
        matches: [],
        flags,
        unmatched: false,
        container: false,
      };
      items.push(item);

      let absorbed = false;
      if (key && !isClass) {
        let res = matchKey(key, { parentHead: parentCtx.head, siblingHeads: heads, parentIsClass: parentCtx.isClass || classPrefix }, rules);
        if (res.absorbed) absorbed = true;
        if (res.matches.length === 0 && !res.absorbed) {
          for (const v of ocrVariants(key)) {
            const r = scan(v, rules, 'ocr_fix');
            if (r.matches.length) {
              res = { matches: dedupe(r.matches), unknownCodes: [] };
              break;
            }
          }
        }
        if (res.matches.length === 0 && res.unknownCodes.length === 0 && !res.absorbed) {
          const f = fuzzyLookup(key, rules);
          if (f) res.matches = [{ ingredientId: f.id, matched: f.alias, kind: 'fuzzy', possible: true }];
        }
        item.matches = res.matches;
        for (const c of res.unknownCodes) unmatched.push(c);
      }

      if (item.matches.length === 0) {
        if (it.children.length > 0 || isClass || absorbed) item.container = true;
        else if (key) {
          item.unmatched = true;
          unmatched.push(key);
        }
      }

      if (it.children.length) {
        const last = key.split(' ').pop() ?? '';
        walk(it.children, position, depth + 1, { head: HEADS.has(last) ? last : null, isClass: isClass || classPrefix });
      }
    });
  }

  walk(raw, '', 0, { head: null, isClass: false });
  return { items, unmatched: [...new Set(unmatched)] };
}
