import { describe, expect, it, vi } from 'vitest';
import { consume, dayKey, FREE_LIMITS, refund, remaining } from '../src/core/limits';
import { aiToText, estimateConfidence, ocrToText } from '../src/core/ocr-text';
import { lookupProduct, normalizeBarcode, offIngredients } from '../src/core/product-lookup';
import { checkForUpdate, initialRules } from '../src/core/rules-sync';
import { recheckEdited, runScan, type ScanEffects } from '../src/core/scan-pipeline';
import { HISTORY_CAP, reminderLabel } from '../src/core/store';
import { bumped, shipped, testStore } from './helpers';

describe('store', () => {
  it('keeps a stable install id', () => {
    const s = testStore();
    expect(s.installId()).toBe(s.installId());
  });
  it('defaults settings and round-trips them', () => {
    const s = testStore();
    expect(s.getSettings().strictMode).toBe(false);
    s.setSettings({ ...s.getSettings(), strictMode: true, disabledCategories: ['sugar'] });
    expect(s.getSettings()).toMatchObject({ strictMode: true, disabledCategories: ['sugar'], noGelatin: false });
  });
  it('caps history but keeps favourites', () => {
    const s = testStore();
    const base = { createdAt: '', source: 'label' as const, text: 't', ocrConfidence: 1, verdict: 'approved' as const, summary: '', rulesVersion: 1, favourite: false };
    s.addEntry({ ...base, id: 'fav', favourite: true });
    for (let i = 0; i < HISTORY_CAP + 5; i++) s.addEntry({ ...base, id: `e${i}` });
    const h = s.getHistory();
    expect(h.length).toBe(HISTORY_CAP + 1);
    expect(h.some((e) => e.id === 'fav')).toBe(true);
    expect(h[0]!.id).toBe(`e${HISTORY_CAP + 4}`);
  });
  it('wipe keeps the rules cache only', () => {
    const s = testStore();
    s.setCachedBundle(bumped(3));
    s.setOnboarded();
    s.wipe();
    expect(s.isOnboarded()).toBe(false);
    expect(s.getCachedBundle()?.version).toBe(3);
  });
  it('survives corrupt JSON', () => {
    const s = testStore();
    s.kv.set('history.v1', '{nope');
    expect(s.getHistory()).toEqual([]);
  });
});

describe('limits', () => {
  const day1 = new Date(2026, 10, 20, 9);
  const day2 = new Date(2026, 10, 21, 0, 1);
  it('counts per local day and resets at midnight', () => {
    const s = testStore();
    for (let i = 0; i < FREE_LIMITS.ai; i++) expect(consume(s, 'ai', day1)).toBe(true);
    expect(consume(s, 'ai', day1)).toBe(false);
    expect(remaining(s, 'ai', day1)).toBe(0);
    expect(remaining(s, 'label', day1)).toBe(FREE_LIMITS.label);
    expect(remaining(s, 'ai', day2)).toBe(FREE_LIMITS.ai);
    expect(dayKey(day1)).toBe('2026-11-20');
  });
});

describe('rules sync', () => {
  it('uses the shipped bundle on first launch', () => expect(initialRules(testStore(), shipped).bundle.version).toBe(1));
  it('prefers a newer cached bundle', () => {
    const s = testStore();
    s.setCachedBundle(bumped(4));
    expect(initialRules(s, shipped).bundle.version).toBe(4);
  });
  it('ignores a cache older than the shipped bundle', () => {
    const s = testStore();
    s.setCachedBundle(bumped(0));
    expect(initialRules(s, bumped(2)).bundle.version).toBe(2);
  });
  it('ignores a corrupt cache', () => {
    const s = testStore();
    s.kv.set('rules.bundle', JSON.stringify({ ...bumped(9), schema: 99 }));
    expect(initialRules(s, shipped).bundle.version).toBe(1);
  });
  it('downloads and caches a newer version', async () => {
    const s = testStore();
    const current = initialRules(s, shipped);
    const download = vi.fn(async () => JSON.stringify(bumped(2)));
    const r = await checkForUpdate(current, { store: s, fetchLatest: async () => ({ version: 2, bundle_url: 'u' }), download });
    expect(r.status).toBe('updated');
    expect(s.getCachedBundle()?.version).toBe(2);
    expect(download).toHaveBeenCalledWith('u');
  });
  it('does nothing when current', async () => {
    const s = testStore();
    const download = vi.fn();
    const r = await checkForUpdate(initialRules(s, shipped), { store: s, fetchLatest: async () => ({ version: 1, bundle_url: 'u' }), download });
    expect(r.status).toBe('current');
    expect(download).not.toHaveBeenCalled();
  });
  it('treats nothing published as current', async () => {
    const s = testStore();
    expect((await checkForUpdate(initialRules(s, shipped), { store: s, fetchLatest: async () => null, download: vi.fn() })).status).toBe('current');
  });
  it('keeps old rules when offline', async () => {
    const s = testStore();
    const r = await checkForUpdate(initialRules(s, shipped), {
      store: s,
      fetchLatest: async () => {
        throw new Error('Network request failed');
      },
      download: vi.fn(),
    });
    expect(r).toEqual({ status: 'offline', error: 'Network request failed' });
  });
  it('rejects a corrupt or mismatched download without caching it', async () => {
    const s = testStore();
    const current = initialRules(s, shipped);
    const latest = async () => ({ version: 3, bundle_url: 'u' });
    expect((await checkForUpdate(current, { store: s, fetchLatest: latest, download: async () => '{"schema":1' })).status).toBe('offline');
    expect((await checkForUpdate(current, { store: s, fetchLatest: latest, download: async () => JSON.stringify(bumped(2)) })).status).toBe('offline');
    expect(s.getCachedBundle()).toBeNull();
  });
});

const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

describe('product lookup', () => {
  it('normalises barcodes', () => {
    expect(normalizeBarcode('012345678905')).toBe('0012345678905');
    expect(normalizeBarcode('9556 0012 3456 7')).toBe('9556001234567');
    expect(normalizeBarcode('123')).toBeNull();
  });
  it('prefers English OFF text', () => {
    expect(offIngredients({ ingredients_text: 'sucre', ingredients_text_en: 'sugar' })).toBe('sugar');
    expect(offIngredients({ ingredients_text: 'gula', ingredients_text_en: ' ' })).toBe('gula');
    expect(offIngredients({})).toBeNull();
  });
  it('checks the local cache first', async () => {
    const s = testStore();
    s.putProduct({ barcode: '9556001234567', text: 'salt', source: 'off', at: new Date().toISOString() });
    const f = vi.fn();
    const hit = await lookupProduct('9556001234567', { store: s, fetchServerProduct: f, fetch: f as never });
    expect(hit).toMatchObject({ text: 'salt', source: 'cache' });
    expect(f).not.toHaveBeenCalled();
  });
  it('refreshes a cached product after 30 days, and falls back to it offline', async () => {
    const s = testStore();
    s.putProduct({ barcode: '9556001234567', text: 'old text', source: 'off', at: new Date(Date.now() - 31 * 864e5).toISOString() });
    const fresh = await lookupProduct('9556001234567', {
      store: s,
      fetchServerProduct: async () => ({ name: null, brand: null, ingredients_raw: 'new text' }),
      fetch: vi.fn() as never,
    });
    expect(fresh?.text).toBe('new text');
    s.putProduct({ barcode: '9556001234568', text: 'stale but known', source: 'off', at: new Date(Date.now() - 31 * 864e5).toISOString() });
    const offline = await lookupProduct('9556001234568', {
      store: s,
      fetchServerProduct: async () => {
        throw new Error('offline');
      },
      fetch: (async () => {
        throw new Error('offline');
      }) as never,
    });
    expect(offline?.text).toBe('stale but known');
  });
  it('then the Supabase products cache', async () => {
    const s = testStore();
    const fetchOff = vi.fn();
    const hit = await lookupProduct('9556001234567', {
      store: s,
      fetchServerProduct: async () => ({ name: 'Wafers', brand: null, ingredients_raw: 'sugar, salt' }),
      fetch: fetchOff as never,
    });
    expect(hit).toMatchObject({ name: 'Wafers', text: 'sugar, salt', source: 'cache' });
    expect(fetchOff).not.toHaveBeenCalled();
    expect(s.getProduct('9556001234567')?.text).toBe('sugar, salt');
  });
  it('then Open Food Facts, with a User-Agent', async () => {
    const s = testStore();
    const f = vi.fn(async () => res(200, { status: 1, product: { product_name: 'Chips', brands: 'Acme, Acme Foods', ingredients_text: 'potatoes, canola oil' } }));
    const hit = await lookupProduct('0012345678905', { store: s, fetchServerProduct: async () => null, fetch: f as never });
    expect(hit).toMatchObject({ name: 'Chips', brand: 'Acme', text: 'potatoes, canola oil', source: 'off' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v2/product/0012345678905.json');
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/MindsetApproved/);
  });
  it('returns null when OFF has the product but no ingredients', async () => {
    const f = vi.fn(async () => res(200, { status: 1, product: { product_name: 'Mystery' } }));
    expect(await lookupProduct('0012345678905', { store: testStore(), fetchServerProduct: async () => null, fetch: f as never })).toBeNull();
  });
  it('returns null when OFF has nothing', async () => {
    const f = vi.fn(async () => res(404, { status: 0 }));
    expect(await lookupProduct('0012345678905', { store: testStore(), fetchServerProduct: async () => null, fetch: f as never })).toBeNull();
  });
  it('times out a slow server and still tries OFF', async () => {
    const f = vi.fn(async () => res(200, { status: 1, product: { ingredients_text: 'water' } }));
    const hit = await lookupProduct('0012345678905', {
      store: testStore(),
      fetchServerProduct: () => new Promise(() => undefined),
      fetch: f as never,
      timeoutMs: 20,
    });
    expect(hit?.text).toBe('water');
  });
  it('returns null when OFF times out', async () => {
    const hit = await lookupProduct('0012345678905', {
      store: testStore(),
      fetchServerProduct: async () => null,
      fetch: (() => new Promise(() => undefined)) as never,
      timeoutMs: 20,
    });
    expect(hit).toBeNull();
  });
});

function fakeEffects() {
  return {
    insertScan: vi.fn(async () => undefined),
    logUnmatched: vi.fn(async () => undefined),
    submitProduct: vi.fn(async () => undefined),
  } satisfies ScanEffects;
}

describe('scan pipeline', () => {
  const rules = initialRules(testStore(), shipped);
  it('decides on the phone, saves history and reports in the background', () => {
    const s = testStore();
    const fx = fakeEffects();
    const { entry, result } = runScan(
      { text: 'Ingredients: corn, canola oil, salt, zzqx gum', source: 'label', ocrConfidence: 0.9, barcode: '9556001234567' },
      { rules, settings: s.getSettings(), store: s, effects: fx },
    );
    expect(result.summary).toBe('Not Approved — contains canola oil.');
    expect(s.getHistory()[0]).toEqual(entry);
    expect(fx.insertScan).toHaveBeenCalledWith(expect.objectContaining({ id: entry.id, verdict: 'not_approved', source: 'label', ocr_text: expect.stringContaining('canola'), install_id: s.installId(), product_name: null, brand: null }), expect.stringContaining('canola'));
    expect(fx.logUnmatched).toHaveBeenCalledWith(['zzqx gum'], expect.any(String));
    expect(fx.submitProduct).toHaveBeenCalledWith('9556001234567', expect.any(String), undefined, undefined);
  });
  it('does not store database text or submit products for barcode hits', () => {
    const s = testStore();
    const fx = fakeEffects();
    runScan({ text: 'water, salt, garlic', source: 'off', ocrConfidence: 1, barcode: '0012345678905' }, { rules, settings: s.getSettings(), store: s, effects: fx });
    expect(fx.insertScan).toHaveBeenCalledWith(expect.objectContaining({ ocr_text: null, verdict: 'approved' }), 'water, salt, garlic');
    expect(fx.submitProduct).not.toHaveBeenCalled();
    expect(fx.logUnmatched).not.toHaveBeenCalled();
  });
  it('never submits an unreadable label', () => {
    const s = testStore();
    const fx = fakeEffects();
    runScan({ text: 'blurry', source: 'label', ocrConfidence: 0.3, barcode: '0012345678905' }, { rules, settings: s.getSettings(), store: s, effects: fx });
    expect(fx.submitProduct).not.toHaveBeenCalled();
  });
  it('works offline with no server effects', () => {
    const s = testStore();
    const { entry } = runScan({ text: 'Ingredients: water, salt, garlic', source: 'label', ocrConfidence: 0.95 }, { rules, settings: s.getSettings(), store: s, effects: null });
    expect(entry.verdict).toBe('approved');
    expect(entry.remoteScanId).toBeUndefined();
  });
  it('a failing server call never throws', async () => {
    const s = testStore();
    const fx = { insertScan: vi.fn(async () => Promise.reject(new Error('down'))), logUnmatched: vi.fn(async () => Promise.reject(new Error('down'))), submitProduct: vi.fn() };
    expect(() => runScan({ text: 'zzqx', source: 'label', ocrConfidence: 1 }, { rules, settings: s.getSettings(), store: s, effects: fx })).not.toThrow();
  });
  it('applies user settings', () => {
    const s = testStore();
    const strict = { ...s.getSettings(), strictMode: true };
    expect(runScan({ text: 'Ingredients: water, natural flavor, salt', source: 'label', ocrConfidence: 1 }, { rules, settings: strict, store: s, effects: null }).entry.verdict).toBe('not_approved');
  });
  it('edited text re-runs and refreshes the product', () => {
    const s = testStore();
    const fx = fakeEffects();
    const { entry } = runScan({ text: 'Ingredients: cano1a oi, salt', source: 'label', ocrConfidence: 0.6, barcode: '9556001234567' }, { rules, settings: s.getSettings(), store: s, effects: null });
    const out = recheckEdited(entry.id, 'Ingredients: avocado oil, salt, potatoes', { rules, settings: s.getSettings(), store: s, effects: fx });
    expect(out?.result.verdict).toBe('approved');
    expect(s.getEntry(entry.id)).toMatchObject({ verdict: 'approved', text: 'Ingredients: avocado oil, salt, potatoes' });
    expect(fx.submitProduct).toHaveBeenCalledOnce();
  });
});

describe('OCR text', () => {
  it('orders blocks top to bottom and keeps line breaks', () => {
    const r = ocrToText({
      text: '',
      blocks: [
        { text: 'b', frame: { top: 200, left: 0, width: 1, height: 1 }, lines: [{ text: 'FLOWER OIL, SALT', elements: [] }] },
        { text: 'a', frame: { top: 10, left: 0, width: 1, height: 1 }, lines: [{ text: 'INGREDIENTS: POTATOES, SUN-', elements: [] }] },
      ],
    });
    expect(r.text).toBe('INGREDIENTS: POTATOES, SUN-\nFLOWER OIL, SALT');
  });
  it('rates clean text high and garbage low', () => {
    expect(estimateConfidence('Ingredients: water, sugar, salt, E330, cocoa (12%)')).toBeGreaterThanOrEqual(0.9);
    expect(estimateConfidence('#@! ~~ 4|| ;; %% ^^ ]]')).toBeLessThan(0.4);
    expect(estimateConfidence('')).toBe(0);
  });
  it('turns the AI answer into parseable text', () => {
    expect(aiToText({ ingredients: ['sugar', 'chocolate (cocoa, sugar)'], may_contain: ['peanuts'] })).toBe(
      'Ingredients: sugar, chocolate (cocoa, sugar). May contain peanuts.',
    );
  });
});

describe('premium', () => {
  it('lifts the daily limits', () => {
    const s = testStore();
    s.setPremium(true);
    for (let i = 0; i < 20; i++) expect(consume(s, 'label')).toBe(true);
    expect(remaining(s, 'ai')).toBe(Number.POSITIVE_INFINITY);
    s.setPremium(false);
    expect(remaining(s, 'label')).toBe(FREE_LIMITS.label);
  });
});

describe('refund', () => {
  it('gives back one use, never below zero', () => {
    const s = testStore();
    consume(s, 'ai');
    expect(remaining(s, 'ai')).toBe(FREE_LIMITS.ai - 1);
    refund(s, 'ai');
    expect(remaining(s, 'ai')).toBe(FREE_LIMITS.ai);
    refund(s, 'ai');
    expect(remaining(s, 'ai')).toBe(FREE_LIMITS.ai);
  });
});

describe('label language', () => {
  it('defaults to Latin and remembers the choice', () => {
    const store = testStore();
    expect(store.getLabelScript()).toBe('latin');
    store.setLabelScript('korean');
    expect(store.getLabelScript()).toBe('korean');
  });

  it('ignores an unknown stored value', () => {
    const store = testStore();
    store.kv.set('label-script.v1', 'klingon');
    expect(store.getLabelScript()).toBe('latin');
  });

  it('scores CJK label text as readable when it has a header', () => {
    expect(estimateConfidence('配料：小麦粉，白砂糖，棕榈油，食用盐')).toBeGreaterThanOrEqual(0.8);
    expect(estimateConfidence('원재료명: 밀가루, 설탕, 팜유, 정제염')).toBeGreaterThanOrEqual(0.8);
  });
});

describe('appearance', () => {
  it('follows the phone until chosen, then remembers the choice', () => {
    const store = testStore();
    expect(store.getAppearance()).toBe('system');
    store.setAppearance('dark');
    expect(store.getAppearance()).toBe('dark');
    store.setAppearance('light');
    expect(store.getAppearance()).toBe('light');
  });

  it('ignores an unknown stored value', () => {
    const store = testStore();
    store.kv.set('appearance.v1', 'sepia');
    expect(store.getAppearance()).toBe('system');
  });
});

describe('scan mode', () => {
  it('opens on the barcode tab until the person picks the label tab, then remembers it', () => {
    const store = testStore();
    expect(store.getScanMode()).toBe('barcode');
    store.setScanMode('label');
    expect(store.getScanMode()).toBe('label');
  });
});

describe('shop-day reminder', () => {
  it('is off until chosen, and remembers day and time', () => {
    const store = testStore();
    expect(store.getReminder()).toEqual({ enabled: false, weekday: 7, hour: 9 });
    store.setReminder({ enabled: true, weekday: 6, hour: 18 });
    expect(store.getReminder()).toEqual({ enabled: true, weekday: 6, hour: 18 });
  });

  it('falls back to safe values for unreadable or out-of-range data', () => {
    const store = testStore();
    store.kv.set('reminder.v1', 'not json');
    expect(store.getReminder().enabled).toBe(false);
    store.kv.set('reminder.v1', JSON.stringify({ enabled: true, weekday: 12, hour: 3 }));
    expect(store.getReminder()).toEqual({ enabled: true, weekday: 7, hour: 9 });
  });

  it('describes the choice in words', () => {
    expect(reminderLabel({ enabled: true, weekday: 7, hour: 9 })).toBe('Saturdays, morning');
    expect(reminderLabel({ enabled: true, weekday: 2, hour: 18 })).toBe('Mondays, after work');
  });
});
