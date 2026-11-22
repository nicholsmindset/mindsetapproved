import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { type AppearancePref, readAppearance, writeAppearance } from '@/core/store';
import { deviceKV } from '@/platform/kv';

/*
 * The appearance choice lives outside React state so the very first frame already uses it (no flash of the
 * wrong theme). On iOS and Android it is also handed to the OS, so system UI (tab bar, alerts, keyboards)
 * matches; the web has no such override, so screens read it from here.
 */
let pref: AppearancePref = readAppearance(deviceKV);
const listeners = new Set<() => void>();

function applyToOS(p: AppearancePref) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(p === 'system' ? 'unspecified' : p);
}
applyToOS(pref);

export function getAppearance(): AppearancePref {
  return pref;
}

/** Saves and applies the choice; every screen re-renders in the new scheme. */
export function setAppearance(p: AppearancePref): void {
  pref = p;
  writeAppearance(deviceKV, p);
  applyToOS(p);
  listeners.forEach((l) => l());
}

export function useAppearance(): AppearancePref {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pref,
    () => pref,
  );
}

/** The scheme to draw with: the user's choice, else the phone's. */
export function useScheme(): 'light' | 'dark' {
  const p = useAppearance();
  const system = useColorScheme();
  if (p !== 'system') return p;
  return system === 'dark' ? 'dark' : 'light';
}
