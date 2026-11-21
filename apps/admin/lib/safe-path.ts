/**
 * Returns `next` only if it is a same-site path ("/admin/stats?x=1"), else the fallback.
 * Rejects absolute URLs, protocol-relative ("//evil.com") and backslash tricks ("/\evil.com"),
 * which browsers can treat as another host.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const url = new URL(next, 'https://same.invalid');
    if (url.origin !== 'https://same.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/** Barcodes are 6–14 digits; anything else never reaches a URL. */
export function isBarcode(v: string): boolean {
  return /^[0-9]{6,14}$/.test(v);
}
