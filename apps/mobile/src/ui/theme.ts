import type { Tier, Verdict } from '@mindset/rules-engine';
import { Platform, useColorScheme } from 'react-native';
import type { IconName } from './Icon';

/*
 * Design: native iOS, premium. Apple's grouped-list structure and type ramp, the system font (San Francisco on
 * iPhone), SF Symbols, continuous-corner cards, soft depth in light mode, true black in dark mode.
 * Colour carries meaning: the brand green tints controls; the four verdict colours are Apple's system
 * green, orange, red and grey so they read the way iPhone users already read them.
 */
const light = {
  bg: '#f2f2f7', // systemGroupedBackground
  surface: '#ffffff', // secondarySystemGroupedBackground
  surface2: '#e9e9ee', // tertiary fill
  fill: 'rgba(118,118,128,0.12)', // quaternarySystemFill (segmented track, chips)
  text: '#000000',
  muted: 'rgba(60,60,67,0.6)', // secondaryLabel
  faint: 'rgba(60,60,67,0.3)', // tertiaryLabel
  border: 'rgba(60,60,67,0.18)', // separator
  rule: '#000000',
  accent: '#1f7a4c', // brand green, tuned to sit with the system palette
  onAccent: '#ffffff',
  good: '#248a3d', // systemGreen (accessible)
  goodBg: 'rgba(52,199,89,0.16)',
  borderline: '#c93400', // systemOrange (accessible)
  borderlineBg: 'rgba(255,149,0,0.2)',
  bad: '#d70015', // systemRed (accessible)
  badBg: 'rgba(255,59,48,0.15)',
  grey: '#6c6c70',
  greyBg: 'rgba(142,142,147,0.18)',
  neutral: 'rgba(60,60,67,0.6)',
  neutralBg: 'rgba(118,118,128,0.12)',
  shadow: '0px 1px 2px rgba(0,0,0,0.04), 0px 6px 20px rgba(0,0,0,0.06)',
};

const dark: typeof light = {
  bg: '#000000',
  surface: '#1c1c1e',
  surface2: '#2c2c2e',
  fill: 'rgba(118,118,128,0.24)',
  text: '#ffffff',
  muted: 'rgba(235,235,245,0.6)',
  faint: 'rgba(235,235,245,0.3)',
  border: 'rgba(84,84,88,0.6)',
  rule: '#ffffff',
  accent: '#3ccf7e',
  onAccent: '#00160a',
  good: '#30d158',
  goodBg: 'rgba(48,209,88,0.2)',
  borderline: '#ff9f0a',
  borderlineBg: 'rgba(255,159,10,0.22)',
  bad: '#ff453a',
  badBg: 'rgba(255,69,58,0.22)',
  grey: '#98989d',
  greyBg: 'rgba(142,142,147,0.24)',
  neutral: 'rgba(235,235,245,0.6)',
  neutralBg: 'rgba(118,118,128,0.24)',
  shadow: 'none',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
/** Fixed light palette, e.g. for share images. */
useColors.light = light;

/** The system font everywhere (San Francisco on iOS, Roboto on Android, the OS UI font on the web). */
export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, monospace' });

/** Apple's Dynamic Type ramp at the default size. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
} as const;

export function verdictStyle(c: Colors, v: Verdict) {
  const s: Record<Verdict, { fg: string; bg: string; icon: 'checkmark-circle' | 'alert-circle' | 'close-circle' | 'help-circle'; symbol: IconName; label: string; stamp: string }> = {
    approved: { fg: c.good, bg: c.goodBg, icon: 'checkmark-circle', symbol: 'checkmark.seal.fill', label: 'Mindset Approved', stamp: 'Approved' },
    caution: { fg: c.borderline, bg: c.borderlineBg, icon: 'alert-circle', symbol: 'exclamationmark.triangle.fill', label: 'Caution', stamp: 'Caution' },
    not_approved: { fg: c.bad, bg: c.badBg, icon: 'close-circle', symbol: 'xmark.octagon.fill', label: 'Not Approved', stamp: 'Not Approved' },
    cant_verify: { fg: c.grey, bg: c.greyBg, icon: 'help-circle', symbol: 'questionmark.circle.fill', label: "Can't verify", stamp: "Can't verify" },
  };
  return s[v];
}

export function tierStyle(c: Colors, t: Tier) {
  return {
    good: { fg: c.good, bg: c.goodBg, label: 'Good sign' },
    neutral: { fg: c.neutral, bg: c.neutralBg, label: 'Neutral' },
    borderline: { fg: c.borderline, bg: c.borderlineBg, label: 'Borderline' },
    bad: { fg: c.bad, bg: c.badBg, label: "Doesn't meet Mindset rules" },
  }[t];
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 22, xl: 28, pill: 999 } as const;
export const MAX_WIDTH = 640;
