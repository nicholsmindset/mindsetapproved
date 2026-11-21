'use client';
import { analyze } from '@mindset/rules-engine';
import { useMemo, useState } from 'react';
import { useDraftRules } from '@/components/DraftRules';
import { ResultDetail, VerdictBanner } from '@/components/Result';

/** Re-runs a reported scan's text on the draft rules, to check whether a rule change fixes it. */
export function Rerun({ text, reportedVerdict }: { text: string; reportedVerdict: string }) {
  const [open, setOpen] = useState(false);
  const rules = useDraftRules();
  const result = useMemo(() => (open && rules ? analyze(text, rules) : null), [open, text, rules]);
  if (!rules) return null;
  if (!open || !result) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        Re-run on draft rules
      </button>
    );
  }
  return (
    <div className="stack">
      <VerdictBanner result={result} label="draft" />
      <p className="small muted">{result.verdict === reportedVerdict ? 'Same verdict as reported.' : `Changed from ${reportedVerdict.replace('_', ' ')}.`}</p>
      <ResultDetail result={result} />
    </div>
  );
}
