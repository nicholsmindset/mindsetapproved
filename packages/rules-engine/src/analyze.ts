import { loadRules, type Rules } from './bundle';
import { isolateIngredients } from './isolate';
import { matchItems } from './match';
import { effectiveTier, TIER_RANK } from './settings';
import { splitIngredients } from './split';
import { DEFAULT_SETTINGS, type AnalyzeOptions, type AnalyzeResult, type Chip, type RulesBundle, type UserSettings } from './types';
import { rollup, summaryFor } from './verdict';

/**
 * Full pipeline: isolate -> split -> match -> apply settings -> verdict.
 * Deterministic and offline; AI clean-up (if any) happens before this, on the text only.
 */
export function analyze(
  text: string,
  rulesOrBundle: Rules | RulesBundle,
  settings: Partial<UserSettings> = {},
  options: AnalyzeOptions = {},
): AnalyzeResult {
  const rules: Rules = 'byId' in rulesOrBundle ? rulesOrBundle : loadRules(rulesOrBundle);
  const s: UserSettings = { ...DEFAULT_SETTINGS, ...settings };
  const ocrConfidence = options.ocrConfidence ?? 1;
  const minConfidence = options.minConfidence ?? 0.8;

  const { block, notes, headerFound } = isolateIngredients(text);
  const { items, unmatched } = matchItems(splitIngredients(block), rules);

  const chips = new Map<string, Chip>();
  for (const item of items) {
    for (const m of item.matches) {
      const ing = rules.byId.get(m.ingredientId);
      if (!ing) continue;
      const tier = effectiveTier(ing, s, rules);
      const prev = chips.get(ing.id);
      if (prev) {
        if (prev.possible && !m.possible) prev.possible = false;
        continue;
      }
      chips.set(ing.id, {
        ingredientId: ing.id,
        name: ing.name,
        shortName: ing.shortName,
        category: ing.category,
        tier,
        baseTier: ing.tier,
        reason: ing.reason,
        labelText: item.text,
        position: item.position,
        possible: m.possible,
        flags: item.flags,
      });
    }
  }

  const all = [...chips.values()];
  const flagged = all
    .filter((c) => c.tier === 'bad' || c.tier === 'borderline')
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
  const good = all.filter((c) => c.tier === 'good');
  const neutral = all.filter((c) => c.tier === 'neutral');

  const leaves = items.filter((i) => !i.container);
  // Confident matches count individual label items, not distinct rules ("salt, sea salt" is still 2 reads).
  const confidentItems = leaves.filter((i) => i.matches.some((m) => !m.possible)).length;

  const verdict = rollup({
    hasBad: flagged.some((c) => c.tier === 'bad'),
    hasBorderline: flagged.some((c) => c.tier === 'borderline'),
    confidentCount: confidentItems,
    leafCount: leaves.length,
    unmatchedLeafCount: leaves.filter((i) => i.unmatched).length,
    ocrConfidence,
    minConfidence,
    minParsed: options.minParsed ?? 3,
    maxUnmatchedRatio: options.maxUnmatchedRatio ?? 0.5,
  });

  const suggestAiRecheck =
    verdict === 'cant_verify' || ocrConfidence < minConfidence || !headerFound || all.some((c) => c.possible);

  return {
    verdict,
    summary: summaryFor(verdict, flagged),
    flagged,
    good,
    neutral,
    unmatched,
    notes,
    items,
    headerFound,
    suggestAiRecheck,
    rulesVersion: rules.bundle.version,
  };
}
