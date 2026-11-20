export interface RawItem {
  /** Name outside brackets, trimmed. */
  name: string;
  /** Leading "and"/"or"/"and/or" that was stripped (alternative-list signal). */
  orPrefix: boolean;
  children: RawItem[];
}

const OPEN = '([{';
const CLOSE = ')]}';
const ROMAN = /^(?:i{1,3}|iv|vi?)$/i;

/** Splits on commas outside brackets, recursing into bracket groups. Tolerates unbalanced OCR brackets. */
export function splitIngredients(text: string): RawItem[] {
  const items: RawItem[] = [];
  let i = 0;
  const n = text.length;

  function parseList(stopAtClose: boolean): RawItem[] {
    const list: RawItem[] = [];
    let name = '';
    let children: RawItem[] = [];
    const flush = () => {
      pushItem(list, name, children);
      name = '';
      children = [];
    };
    while (i < n) {
      const c = text[i]!;
      if (OPEN.includes(c)) {
        i++;
        const inner = parseList(true);
        // "E322(i)", "500(ii)": a roman sub-index belongs to the code, not a child ingredient
        if (inner.length === 1 && inner[0]!.children.length === 0 && ROMAN.test(inner[0]!.name)) name += inner[0]!.name;
        else children = children.concat(inner);
        continue;
      }
      if (CLOSE.includes(c)) {
        i++;
        if (stopAtClose) {
          flush();
          return list;
        }
        continue; // stray closing bracket
      }
      if (c === ',') {
        i++;
        flush();
        continue;
      }
      name += c;
      i++;
    }
    flush();
    return list;
  }

  items.push(...parseList(false));
  return items;
}

function pushItem(list: RawItem[], rawName: string, children: RawItem[]): void {
  let name = rawName.replace(/\s+/g, ' ').trim();
  let orPrefix = false;
  const pre = /^(?:and\s*\/\s*or|and|or|&)\s+/i.exec(name);
  if (pre) {
    orPrefix = true;
    name = name.slice(pre[0].length);
  }
  name = name.replace(/^[:\-–.\s]+|[:\-–.\s]+$/g, '');
  if (!name && children.length === 0) return;
  if (!name && list.length > 0) {
    // "(...)" right after a comma: attach to the previous item
    list[list.length - 1]!.children.push(...children);
    return;
  }
  list.push({ name, orPrefix, children });
}
