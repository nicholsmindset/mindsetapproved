import { analyze, type AnalyzeResult, type Rules, type UserSettings } from '@mindset/rules-engine';
import type { HistoryEntry, ScanSource, Store } from './store';

export interface ScanInput {
  text: string;
  source: ScanSource;
  /** 0..1; 1 for database text. */
  ocrConfidence: number;
  barcode?: string;
  productName?: string;
  brand?: string;
}

/** Server calls a scan triggers. All are fire-and-forget: the verdict never waits on the network. */
export interface ScanEffects {
  insertScan(row: {
    id: string;
    install_id: string;
    barcode: string | null;
    ocr_text: string | null;
    ocr_confidence: number;
    verdict: string;
    matched: { ingredientId: string; tier: string; possible: boolean }[];
    rules_version: number;
    source: ScanSource;
    product_name: string | null;
    brand: string | null;
  }, fullText: string): Promise<unknown>;
  logUnmatched(terms: string[], example: string): Promise<unknown>;
  submitProduct(barcode: string, text: string, name?: string, brand?: string): Promise<unknown>;
}

export interface ScanOutcome {
  entry: HistoryEntry;
  result: AnalyzeResult;
}

export function chipsForServer(r: AnalyzeResult) {
  return [...r.flagged, ...r.good].map((c) => ({ ingredientId: c.ingredientId, tier: c.tier, possible: c.possible }));
}

/** Runs the rules on the phone, saves to history, then reports to the server in the background. */
export function runScan(input: ScanInput, deps: { rules: Rules; settings: UserSettings; store: Store; effects: ScanEffects | null }): ScanOutcome {
  const result = analyze(input.text, deps.rules, deps.settings, { ocrConfidence: input.ocrConfidence });
  const id = deps.store.newId();
  const entry: HistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    source: input.source,
    barcode: input.barcode,
    productName: input.productName,
    brand: input.brand,
    text: input.text,
    ocrConfidence: input.ocrConfidence,
    verdict: result.verdict,
    summary: result.summary,
    rulesVersion: result.rulesVersion,
    favourite: false,
    remoteScanId: deps.effects ? id : undefined,
  };
  deps.store.addEntry(entry);

  const fx = deps.effects;
  if (fx) {
    const swallow = () => undefined;
    fx.insertScan({
      id,
      install_id: deps.store.installId(),
      barcode: input.barcode ?? null,
      // Only text the user photographed is stored; database text is already in products/OFF.
      ocr_text: input.source === 'label' || input.source === 'ai' ? input.text.slice(0, 8000) : null,
      ocr_confidence: input.ocrConfidence,
      verdict: result.verdict,
      matched: chipsForServer(result),
      rules_version: result.rulesVersion,
      source: input.source,
      product_name: input.productName ?? null,
      brand: input.brand ?? null,
    }, input.text).catch(swallow);
    if (result.unmatched.length) fx.logUnmatched(result.unmatched.slice(0, 50), input.text.slice(0, 500)).catch(swallow);
    // Flow B step 5: a label photographed for a barcode the databases didn't know.
    if (input.barcode && (input.source === 'label' || input.source === 'ai') && result.verdict !== 'cant_verify') {
      fx.submitProduct(input.barcode, input.text, input.productName, input.brand).catch(swallow);
    }
  }
  return { entry, result };
}

/** The user corrected the scanned text: re-run, update history, and refresh the product cache entry. */
export function recheckEdited(
  entryId: string,
  text: string,
  deps: { rules: Rules; settings: UserSettings; store: Store; effects: ScanEffects | null },
): ScanOutcome | null {
  const entry = deps.store.getEntry(entryId);
  if (!entry) return null;
  const result = analyze(text, deps.rules, deps.settings, { ocrConfidence: 1 });
  const patch = { text, verdict: result.verdict, summary: result.summary, rulesVersion: result.rulesVersion, ocrConfidence: 1 };
  deps.store.updateEntry(entryId, patch);
  if (deps.effects && entry.barcode && result.verdict !== 'cant_verify') {
    deps.effects.submitProduct(entry.barcode, text, entry.productName, entry.brand).catch(() => undefined);
  }
  return { entry: { ...entry, ...patch }, result };
}
