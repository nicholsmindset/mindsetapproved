import type { Chip, Verdict } from './types';

export function joinNames(names: string[], max = 3): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length > max) return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function summaryFor(verdict: Verdict, flagged: Chip[]): string {
  switch (verdict) {
    case 'approved':
      return 'Mindset Approved — no flagged ingredients found.';
    case 'caution': {
      const n = flagged.filter((c) => c.tier === 'borderline').length;
      return `Caution — ${n} borderline ingredient${n === 1 ? '' : 's'}.`;
    }
    case 'not_approved':
      return `Not Approved — contains ${joinNames(flagged.filter((c) => c.tier === 'bad').map((c) => c.shortName))}.`;
    case 'cant_verify':
      return "Can't verify — retake the photo.";
  }
}

export interface RollupInput {
  hasBad: boolean;
  hasBorderline: boolean;
  confidentCount: number;
  leafCount: number;
  unmatchedLeafCount: number;
  ocrConfidence: number;
  minConfidence: number;
  minParsed: number;
  maxUnmatchedRatio: number;
}

/** Worst tier wins. Approved needs a good read; otherwise Can't verify. Never Approved on a bad read. */
export function rollup(r: RollupInput): Verdict {
  if (r.hasBad) return 'not_approved';
  if (r.hasBorderline) return 'caution';
  const goodRead =
    r.confidentCount >= r.minParsed &&
    r.ocrConfidence >= r.minConfidence &&
    (r.leafCount === 0 || r.unmatchedLeafCount / r.leafCount <= r.maxUnmatchedRatio);
  return goodRead ? 'approved' : 'cant_verify';
}
