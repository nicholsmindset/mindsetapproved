/** Minimal key-value interface the app stores through: MMKV on device, a Map in tests. */
export interface KV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clearAll(): void;
}

export function memoryKV(seed: Record<string, string> = {}): KV {
  const m = new Map(Object.entries(seed));
  return {
    getString: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
    clearAll: () => m.clear(),
  };
}
