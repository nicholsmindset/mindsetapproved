import type { Tier, Verdict } from '@mindset/rules-engine';
import { useColorScheme } from 'react-native';

/*
 * Design: "the label, annotated". The vocabulary comes from food packaging, not app templates:
 * - nutrition-panel type (bold condensed heads, a heavy ink rule under page titles),
 * - the verdict as an inspection stamp,
 * - the ingredient list shown as printed text with flagged items marked like a highlighter on the pack.
 * Colour is reserved for meaning (the four verdicts and tiers); everything else is ink on label stock.
 */
const light = {
  bg: '#f4f5f1', // label stock
  surface: '#fcfcfa',
  surface2: '#e9ebe5',
  text: '#121412', // ink
  muted: '#5b615b',
  border: '#d3d7cf', // hairline
  rule: '#121412', // the panel's heavy rule
  accent: '#2d5a3d', // bottle green, same as the app icon
  onAccent: '#ffffff',
  good: '#17703f',
  goodBg: '#d9efdf',
  borderline: '#9a5a00',
  borderlineBg: '#ffe7a6', // highlighter yellow
  bad: '#b8241a',
  badBg: '#ffd6d0',
  grey: '#4f5a64',
  greyBg: '#e2e6ea',
  neutral: '#5d625c',
  neutralBg: '#e6e8e3',
};

const dark: typeof light = {
  bg: '#0e100f',
  surface: '#161917',
  surface2: '#202421',
  text: '#eef0ea',
  muted: '#9aa19a',
  border: '#2c312d',
  rule: '#eef0ea',
  accent: '#8fcca2',
  onAccent: '#0b140e',
  good: '#7fd59f',
  goodBg: '#173524',
  borderline: '#f5c35a',
  borderlineBg: '#3d2f0a',
  bad: '#ff8f84',
  badBg: '#45150f',
  grey: '#b5bfc8',
  greyBg: '#252b31',
  neutral: '#c2c7bf',
  neutralBg: '#252925',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
/** Fixed light palette, e.g. for share images. */
useColors.light = light;

/** Font families loaded in app/_layout.tsx. With a custom family, never also set fontWeight (Android picks the wrong face). */
export const font = {
  display: 'BarlowCondensed_700Bold',
  heavy: 'BarlowCondensed_800ExtraBold',
  body: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semi: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export function verdictStyle(c: Colors, v: Verdict) {
  switch (v) {
    case 'approved':
      return { fg: c.good, bg: c.goodBg, icon: 'checkmark-circle' as const, label: 'Mindset Approved', stamp: 'Approved' };
    case 'caution':
      return { fg: c.borderline, bg: c.borderlineBg, icon: 'alert-circle' as const, label: 'Caution', stamp: 'Caution' };
    case 'not_approved':
      return { fg: c.bad, bg: c.badBg, icon: 'close-circle' as const, label: 'Not Approved', stamp: 'Not approved' };
    case 'cant_verify':
      return { fg: c.grey, bg: c.greyBg, icon: 'help-circle' as const, label: "Can't verify", stamp: "Can't verify" };
  }
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
/** Packaging is cut square; corners stay tight. */
export const radius = { sm: 4, md: 6, lg: 10, pill: 999 } as const;
export const MAX_WIDTH = 640;
