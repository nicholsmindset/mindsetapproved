import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Strings that could carry what someone scanned: label text, product text, codes. Never sent. */
const PRIVATE_KEYS = /text|label|ingredient|barcode|ocr|comment|email|image|photo/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, PRIVATE_KEYS.test(k) ? '[removed]' : scrub(v, depth + 1)]));
}

/**
 * Crash reporting, off until EXPO_PUBLIC_SENTRY_DSN is set. Sends crashes and errors only: no user identity,
 * no IP-based data, no screenshots, and no label text (scrubbed below).
 */
export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    environment: __DEV__ ? 'development' : 'production',
    beforeBreadcrumb: (b) => (b.category === 'console' || b.category === 'xhr' || b.category === 'fetch' ? null : b),
    beforeSend: (event) => {
      delete event.user;
      if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
      return event;
    },
  });
}

export function reportError(error: unknown): void {
  if (DSN) Sentry.captureException(error);
}
