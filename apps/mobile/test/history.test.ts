import { describe, expect, it } from 'vitest';
import { historyToCsv } from '../src/core/export';
import { mergeRemote, type RemoteScan } from '../src/core/history-sync';
import type { HistoryEntry } from '../src/core/store';

const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'l1', createdAt: '2026-11-20T10:00:00Z', source: 'label', text: 'Ingredients: water', ocrConfidence: 1, verdict: 'approved',
  summary: 'Mindset Approved — no flagged ingredients found.', rulesVersion: 1, favourite: false, ...over,
});
const remote = (over: Partial<RemoteScan>): RemoteScan => ({
  id: 'r1', created_at: '2026-11-21T10:00:00Z', source: 'label', barcode: null, ocr_text: 'Ingredients: canola oil', ocr_confidence: 0.9,
  verdict: 'not_approved', rules_version: 2, favourite: false, product_name: null, brand: null, ...over,
});

describe('mergeRemote', () => {
  it('adds scans made on another device, newest first', () => {
    const { merged, added } = mergeRemote([entry({})], [remote({})]);
    expect(added).toBe(1);
    expect(merged.map((e) => e.id)).toEqual(['r1', 'l1']);
    expect(merged[0]).toMatchObject({ remoteScanId: 'r1', text: 'Ingredients: canola oil', verdict: 'not_approved' });
  });
  it('does not duplicate scans this phone already has', () => {
    const { merged, added } = mergeRemote([entry({ remoteScanId: 'r1' })], [remote({})]);
    expect(added).toBe(0);
    expect(merged).toHaveLength(1);
  });
  it('a favourite from another device sticks', () => {
    const { merged } = mergeRemote([entry({ remoteScanId: 'r1' })], [remote({ favourite: true })]);
    expect(merged[0]!.favourite).toBe(true);
  });
  it('local text edits win', () => {
    const { merged } = mergeRemote([entry({ remoteScanId: 'r1', text: 'edited' })], [remote({ ocr_text: 'original' })]);
    expect(merged[0]!.text).toBe('edited');
  });
  it('skips scans without ingredient text', () => {
    expect(mergeRemote([], [remote({ ocr_text: null })]).added).toBe(0);
  });
});

describe('historyToCsv', () => {
  it('writes a header and one row per scan, quoting where needed', () => {
    const csv = historyToCsv([entry({ productName: 'Chips, "Salted"', text: 'Ingredients:\ncorn, salt', favourite: true })]);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe('Date,Product,Brand,Barcode,Verdict,Summary,Favourite,Source,Rules version,Ingredients');
    expect(lines[1]).toContain('"Chips, ""Salted"""');
    expect(lines[1]).toContain('"Ingredients: corn, salt"');
    expect(lines[1]).toContain(',yes,');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(historyToCsv([entry({ productName: '=HYPERLINK("x")' })])).toContain(`"'=HYPERLINK(""x"")"`);
  });
  it('starts with a BOM for Excel', () => expect(historyToCsv([]).charCodeAt(0)).toBe(0xfeff));
});
