import type { Store } from './store';

export interface ProductHit {
  barcode: string;
  name?: string;
  brand?: string;
  text: string;
  source: 'cache' | 'off';
}

export interface LookupDeps {
  store: Store;
  /** Supabase products row for this barcode, or null. */
  fetchServerProduct: (barcode: string) => Promise<{ name: string | null; brand: string | null; ingredients_raw: string } | null>;
  fetch: typeof fetch;
  timeoutMs?: number;
}

export const PRODUCT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const OFF_USER_AGENT = 'MindsetApproved/0.1 (food ingredient scanner)';

export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  // UPC-A read as 12 digits and EAN-13 with a leading 0 are the same product; OFF uses 13 digits.
  return digits.length === 12 ? `0${digits}` : digits;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, reject) => {
      t = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

/** Picks the best ingredient text from an OFF product: English first, then the main text. */
export function offIngredients(p: OffProduct): string | null {
  const t = (p.ingredients_text_en ?? '').trim() || (p.ingredients_text ?? '').trim();
  return t || null;
}

/**
 * Flow A: local cache, then the Supabase products cache, then Open Food Facts (one call per real scan).
 * Returns null when no source has ingredient text, so the app asks for a label photo.
 */
export async function lookupProduct(rawBarcode: string, deps: LookupDeps): Promise<ProductHit | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode) return null;
  const timeout = deps.timeoutMs ?? 3000;

  const local = deps.store.getProduct(barcode);
  // Refresh after 30 days, so corrections made since then reach this phone.
  const fresh = local && Date.now() - Date.parse(local.at) < PRODUCT_TTL_MS;
  if (local && fresh) return { barcode, name: local.name, brand: local.brand, text: local.text, source: 'cache' };

  try {
    const row = await withTimeout(deps.fetchServerProduct(barcode), timeout);
    if (row?.ingredients_raw) {
      const hit: ProductHit = { barcode, name: row.name ?? undefined, brand: row.brand ?? undefined, text: row.ingredients_raw, source: 'cache' };
      deps.store.putProduct({ ...hit, at: new Date().toISOString() });
      return hit;
    }
  } catch {
    // offline or slow: try OFF
  }

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_en,brands,ingredients_text,ingredients_text_en`;
    const res = await withTimeout(deps.fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT } }), timeout);
    if (!res.ok) return staleOrNull();
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    if (body.status !== 1 || !body.product) return staleOrNull();
    const text = offIngredients(body.product);
    if (!text) return staleOrNull();
    const hit: ProductHit = {
      barcode,
      name: body.product.product_name_en || body.product.product_name || undefined,
      brand: body.product.brands?.split(',')[0]?.trim() || undefined,
      text,
      source: 'off',
    };
    deps.store.putProduct({ ...hit, at: new Date().toISOString() });
    return hit;
  } catch {
    return staleOrNull();
  }

  /** Offline or nothing newer: an expired local copy is still better than asking for a photo. */
  function staleOrNull(): ProductHit | null {
    return local ? { barcode: barcode!, name: local.name, brand: local.brand, text: local.text, source: 'cache' } : null;
  }
}
