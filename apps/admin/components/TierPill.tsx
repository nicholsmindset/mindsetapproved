import type { Tier } from '@mindset/rules-engine';

export function TierPill({ tier }: { tier: Tier | null | undefined }) {
  return <span className={`pill tier-${tier ?? 'none'}`}>{tier ?? 'untiered'}</span>;
}
