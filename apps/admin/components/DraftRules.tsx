'use client';
import { loadRules, type Rules, type RulesBundle } from '@mindset/rules-engine';
import { createContext, useContext, useMemo } from 'react';

const Ctx = createContext<Rules | null>(null);

/** Sends the draft bundle to the browser once per page; children read it with useDraftRules(). */
export function DraftRulesProvider({ bundle, children }: { bundle: RulesBundle; children: React.ReactNode }) {
  const rules = useMemo(() => loadRules(bundle), [bundle]);
  return <Ctx.Provider value={rules}>{children}</Ctx.Provider>;
}

export function useDraftRules(): Rules | null {
  return useContext(Ctx);
}
