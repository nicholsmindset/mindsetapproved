import type { HistoryEntry } from './store';

const VERDICT: Record<HistoryEntry['verdict'], string> = {
  approved: 'Approved',
  caution: 'Caution',
  not_approved: 'Not Approved',
  cant_verify: "Can't verify",
};

function cell(v: string | number | boolean | undefined): string {
  const s = v === undefined ? '' : String(v);
  // Quote fields with separators or quotes; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** History as CSV (UTF-8 with BOM so Excel opens it correctly). */
export function historyToCsv(entries: HistoryEntry[]): string {
  const header = ['Date', 'Product', 'Brand', 'Barcode', 'Verdict', 'Summary', 'Favourite', 'Source', 'Rules version', 'Ingredients'];
  const rows = entries.map((e) =>
    [e.createdAt, e.productName, e.brand, e.barcode, VERDICT[e.verdict], e.summary, e.favourite ? 'yes' : '', e.source, e.rulesVersion, e.text.replace(/\s+/g, ' ').trim()]
      .map(cell)
      .join(','),
  );
  return `﻿${[header.join(','), ...rows].join('\r\n')}\r\n`;
}
