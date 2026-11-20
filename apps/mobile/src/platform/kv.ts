import { createMMKV } from 'react-native-mmkv';
import type { KV } from '@/core/kv';

// MMKV on iOS/Android; react-native-mmkv's web build falls back to localStorage.
const mmkv = createMMKV({ id: 'mindset-approved' });

export const deviceKV: KV = {
  getString: (k) => mmkv.getString(k),
  set: (k, v) => mmkv.set(k, v),
  remove: (k) => void mmkv.remove(k),
  clearAll: () => mmkv.clearAll(),
};
