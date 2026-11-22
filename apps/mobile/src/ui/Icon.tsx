import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';

/** SF Icon name -> the closest Ionicon, used on Android and the web. */
const FALLBACK = {
  'barcode.viewfinder': 'barcode-outline',
  'doc.text.viewfinder': 'document-text-outline',
  'text.viewfinder': 'scan-outline',
  'clock.fill': 'time',
  'clock': 'time-outline',
  'slider.horizontal.3': 'options',
  'gearshape.fill': 'settings',
  'gearshape': 'settings-outline',
  'checkmark.seal.fill': 'checkmark-circle',
  'exclamationmark.triangle.fill': 'warning',
  'xmark.octagon.fill': 'close-circle',
  'questionmark.circle.fill': 'help-circle',
  'heart': 'heart-outline',
  'heart.fill': 'heart',
  'square.and.arrow.up': 'share-outline',
  'pencil': 'create-outline',
  'sparkles': 'sparkles',
  'flag': 'flag-outline',
  'chevron.right': 'chevron-forward',
  'chevron.down': 'chevron-down',
  'chevron.up': 'chevron-up',
  'flashlight.on.fill': 'flashlight',
  'flashlight.off.fill': 'flashlight-outline',
  'camera.fill': 'camera',
  'magnifyingglass': 'search',
  'checkmark': 'checkmark',
  'checkmark.circle.fill': 'checkmark-circle',
  'info.circle.fill': 'information-circle',
  'leaf.fill': 'leaf',
  'drop.fill': 'water',
  'paintpalette.fill': 'color-palette',
  'cube.fill': 'cube',
  'flask.fill': 'flask',
  'shield.lefthalf.filled': 'shield-half',
  'lock.fill': 'lock-closed',
  'globe': 'globe-outline',
  'person.crop.circle.fill': 'person-circle',
  'crown.fill': 'ribbon',
  'arrow.down.doc.fill': 'download',
  'trash.fill': 'trash',
  'arrow.clockwise': 'refresh',
  'link': 'link',
  'doc.on.doc': 'copy-outline',
  'photo': 'image-outline',
  'hand.raised.fill': 'hand-left',
  'list.bullet.rectangle.fill': 'list',
  'character.bubble.fill': 'language',
  'fork.knife': 'restaurant',
  'pawprint.fill': 'paw',
  'bolt.fill': 'flash',
  'xmark': 'close',
} as const satisfies Record<string, keyof typeof Ionicons.glyphMap>;

export type IconName = keyof typeof FALLBACK;

export function Icon({ name, size = 20, color, weight = 'semibold' }: { name: IconName; size?: number; color: string; weight?: 'regular' | 'medium' | 'semibold' | 'bold' }) {
  const fallback = <Ionicons name={FALLBACK[name]} size={size} color={color} />;
  if (Platform.OS !== 'ios') return fallback;
  return <SymbolView name={name} size={size} tintColor={color} weight={weight} type="hierarchical" fallback={fallback} />;
}
