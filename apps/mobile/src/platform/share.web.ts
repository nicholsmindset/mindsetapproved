import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

export const canShareImage = false;

export async function shareCardImage(_card: RefObject<ComponentRef<typeof View> | null>): Promise<void> {
  throw new Error('Image sharing is only available in the app.');
}

/** Web Share API where the browser has it (mobile Safari, Chrome); otherwise copy the link. */
export async function shareLink(message: string, url: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ text: message, url });
      return 'shared';
    } catch {
      // cancelled or not allowed: fall back to copying
    }
  }
  await copyLink(url);
  return 'copied';
}

export async function copyLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}
