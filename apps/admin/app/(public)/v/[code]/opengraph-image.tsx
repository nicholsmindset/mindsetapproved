import { ImageResponse } from 'next/og';
import { getShared, shareDetail, shareSummary, VERDICT_LABEL } from '@/lib/share';

export const alt = 'Mindset Approved verdict';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLORS = {
  approved: { fg: '#1f7a4d', bg: '#e3f2e9' },
  caution: { fg: '#9a5b00', bg: '#fbeed5' },
  not_approved: { fg: '#b3261e', bg: '#fbe3e1' },
  cant_verify: { fg: '#5f6368', bg: '#e8e8e6' },
} as const;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const s = await getShared((await params).code);
  const verdict = s?.verdict ?? 'cant_verify';
  const c = COLORS[verdict];
  const summary = s ? shareSummary(s) : 'Scan any label and see why.';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f6f5f1', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 700, color: '#1c1b18' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#2d5a3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          Mindset Approved
        </div>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', background: c.bg, borderRadius: 32, padding: 48, flex: 1 }}>
          <div style={{ fontSize: 30, color: '#6a675e' }}>{s?.product_name ?? 'Scanned with Mindset Approved'}</div>
          <div style={{ fontSize: 92, fontWeight: 800, color: c.fg, marginTop: 8 }}>{VERDICT_LABEL[verdict]}</div>
          <div style={{ fontSize: 40, color: '#1c1b18', marginTop: 16 }}>{shareDetail(summary)}</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 24, color: '#6a675e' }}>Ingredient verdict based on Mindset preferences · not medical advice</div>
      </div>
    ),
    size,
  );
}
