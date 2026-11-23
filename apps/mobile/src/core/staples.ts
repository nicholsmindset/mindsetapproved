import { analyze, type AnalyzeResult, type Rules, type UserSettings, type Verdict } from '@mindset/rules-engine';
import type { HistoryEntry } from './store';

/** What this entry gets today: current rules and the person's current settings (the stored verdict is from scan time). */
export function currentResult(e: HistoryEntry, rules: Rules, settings: UserSettings): AnalyzeResult {
  return analyze(e.text, rules, settings, { ocrConfidence: e.ocrConfidence });
}

export interface Current {
  verdict: Verdict;
  summary: string;
}

// Lists show hundreds of rows: analyse each once per (rules, settings, text). Keyed on the objects, so a new
// bundle or changed settings start a fresh cache with no manual invalidation.
const memo = new WeakMap<Rules, WeakMap<UserSettings, Map<string, Current>>>();

export function cachedCurrent(e: HistoryEntry, rules: Rules, settings: UserSettings): Current {
  let bySettings = memo.get(rules);
  if (!bySettings) memo.set(rules, (bySettings = new WeakMap()));
  let rows = bySettings.get(settings);
  if (!rows) bySettings.set(settings, (rows = new Map()));
  const key = `${e.text}|${e.ocrConfidence}`;
  const hit = rows.get(key);
  if (hit) return hit;
  const out = currentResult(e, rules, settings);
  const made = { verdict: out.verdict, summary: out.summary };
  rows.set(key, made);
  return made;
}

export function currentVerdict(e: HistoryEntry, rules: Rules, settings: UserSettings): Verdict {
  return currentResult(e, rules, settings).verdict;
}

export interface StapleChange {
  entry: HistoryEntry;
  was: Verdict;
  now: Verdict;
}

/**
 * Saved products whose verdict differs from the one they had when the person last looked
 * (the baseline is stored when saving, and reset by "Got it"). Products saved before baselines existed
 * have none, so they never show as changed.
 */
export function stapleChanges(entries: HistoryEntry[], rules: Rules, settings: UserSettings): StapleChange[] {
  const out: StapleChange[] = [];
  for (const entry of entries) {
    if (!entry.favourite || !entry.savedVerdict) continue;
    const now = currentVerdict(entry, rules, settings);
    if (now !== entry.savedVerdict) out.push({ entry, was: entry.savedVerdict, now });
  }
  return out;
}

const WORSE: Record<Verdict, number> = { approved: 0, cant_verify: 1, caution: 2, not_approved: 3 };

/** "2 of your saved products now get a different verdict", with the direction when they all moved the same way. */
export function changeMessage(changes: StapleChange[]): string {
  const n = changes.length;
  const noun = n === 1 ? '1 of your saved products now gets' : `${n} of your saved products now get`;
  const worse = changes.filter((c) => WORSE[c.now] > WORSE[c.was]).length;
  const dir = worse === n ? 'a stricter' : worse === 0 ? 'a more relaxed' : 'a different';
  return `${noun} ${dir} verdict, because your rules changed.`;
}
