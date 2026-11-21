import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export const canShareImage = true;

/** Renders the on-screen verdict card to a PNG and opens the system share sheet (Instagram, TikTok, WhatsApp…). */
export async function shareCardImage(card: RefObject<ComponentRef<typeof View> | null>): Promise<void> {
  const uri = await captureRef(card as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this verdict', UTI: 'public.png' });
}

export async function shareLink(message: string, url: string): Promise<'shared' | 'copied'> {
  await Share.share({ message: `${message} ${url}`, url });
  return 'shared';
}

export async function copyLink(url: string): Promise<void> {
  await Clipboard.setStringAsync(url);
}
