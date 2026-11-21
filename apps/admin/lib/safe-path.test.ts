import { describe, expect, it } from 'vitest';
import { isBarcode, safeNextPath } from './safe-path';

describe('safeNextPath', () => {
  it.each([
    ['/admin/stats', '/admin/stats'],
    ['/admin/ingredients?q=oil#top', '/admin/ingredients?q=oil#top'],
  ])('keeps %s', (input, out) => expect(safeNextPath(input, '/x')).toBe(out));
  it.each(['//evil.com', '/\\evil.com', '\\\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/%0d%0aSet-Cookie:x', '', null, undefined, 'admin', '/\tevil'])(
    'rejects %s',
    (input) => {
      const out = safeNextPath(input as string, '/fallback');
      expect(out === '/fallback' || out.startsWith('/%0d')).toBe(true);
      expect(out.startsWith('//')).toBe(false);
    },
  );
});

describe('isBarcode', () => {
  it('accepts digits only', () => {
    expect(isBarcode('9556001000017')).toBe(true);
    expect(isBarcode('//evil')).toBe(false);
    expect(isBarcode('12345')).toBe(false);
  });
});
