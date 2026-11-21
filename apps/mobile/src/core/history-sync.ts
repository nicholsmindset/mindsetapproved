import type { Verdict } from '@mindset/rules-engine';
import type { HistoryEntry, ScanSource } from './store';

/** The scans columns a signed-in user's history needs (RLS: own rows only). */
export interface RemoteScan {
  id: string;
  created_at: string;
  source: ScanSource | null;
  barcode: string | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  verdict: Verdict;
  rules_version: number | null;
  favourite: boolean;
  product_name: string | null;
  brand: string | null;
}

export const REMOTE_SCAN_COLUMNS =
  'id, created_at, source, barcode, ocr_text, ocr_confidence, verdict, rules_version, favourite, product_name, brand';

/**
 * Merges the account's scans into local history (by scan id). Local entries win on text edits; a favourite
 * set on any device sticks. Scans without ingredient text can't be re-checked, so they are skipped.
 */
export function mergeRemote(local: HistoryEntry[], remote: RemoteScan[]): { merged: HistoryEntry[]; added: number } {
  const byRemoteId = new Map(local.filter((e) => e.remoteScanId).map((e) => [e.remoteScanId!, e]));
  const merged = [...local];
  let added = 0;
  for (const r of remote) {
    const existing = byRemoteId.get(r.id);
    if (existing) {
      if (r.favourite && !existing.favourite) existing.favourite = true;
      continue;
    }
    if (!r.ocr_text) continue;
    merged.push({
      id: r.id,
      remoteScanId: r.id,
      createdAt: r.created_at,
      source: r.source ?? 'label',
      barcode: r.barcode ?? undefined,
      productName: r.product_name ?? undefined,
      brand: r.brand ?? undefined,
      text: r.ocr_text,
      ocrConfidence: r.ocr_confidence ?? 1,
      verdict: r.verdict,
      summary: '',
      rulesVersion: r.rules_version ?? 0,
      favourite: r.favourite,
    });
    added++;
  }
  merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { merged, added };
}
