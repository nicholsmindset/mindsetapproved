import type { Tier, Verdict } from '@mindset/rules-engine';
import { useColorScheme } from 'react-native';

const light = {
  bg: '#f6f5f1',
  surface: '#ffffff',
  surface2: '#efede6',
  text: '#1c1b18',
  muted: '#6a675e',
  border: '#dcd8cc',
  accent: '#2d5a3d',
  onAccent: '#ffffff',
  good: '#1f7a4d',
  goodBg: '#e3f2e9',
  borderline: '#9a5b00',
  borderlineBg: '#fbeed5',
  bad: '#b3261e',
  badBg: '#fbe3e1',
  grey: '#5f6368',
  greyBg: '#e8e8e6',
  neutral: '#5d5a52',
  neutralBg: '#eceae3',
};

const dark: typeof light = {
  bg: '#151513',
  surface: '#1e1e1b',
  surface2: '#282824',
  text: '#ecebe6',
  muted: '#a19e94',
  border: '#3a3934',
  accent: '#7fbf95',
  onAccent: '#10180f',
  good: '#7fd1a2',
  goodBg: '#183324',
  borderline: '#f2bb5c',
  borderlineBg: '#3a2a0c',
  bad: '#ff8a80',
  badBg: '#3d1714',
  grey: '#b8b9bb',
  greyBg: '#2c2d2f',
  neutral: '#c4c1b8',
  neutralBg: '#2c2b27',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function verdictStyle(c: Colors, v: Verdict) {
  switch (v) {
    case 'approved':
      return { fg: c.good, bg: c.goodBg, icon: 'checkmark-circle' as const, label: 'Mindset Approved' };
    case 'caution':
      return { fg: c.borderline, bg: c.borderlineBg, icon: 'alert-circle' as const, label: 'Caution' };
    case 'not_approved':
      return { fg: c.bad, bg: c.badBg, icon: 'close-circle' as const, label: 'Not Approved' };
    case 'cant_verify':
      return { fg: c.grey, bg: c.greyBg, icon: 'help-circle' as const, label: "Can't verify" };
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
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const MAX_WIDTH = 640;
