import type { Verdict } from '@mindset/rules-engine';

const STYLE: Record<Verdict, { cls: string; label: string }> = {
  approved: { cls: 'tier-good', label: 'Approved' },
  caution: { cls: 'tier-borderline', label: 'Caution' },
  not_approved: { cls: 'tier-bad', label: 'Not Approved' },
  cant_verify: { cls: 'tier-none', label: "Can't verify" },
};

/** Verdict label with colour; the text always names the verdict, so colour is never the only signal. */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLE[verdict];
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}
