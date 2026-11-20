import { ungzip } from 'pako';

/** Downloads a rules bundle (.json.gz or plain .json) and returns its JSON text. */
export async function downloadBundle(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return ungzip(bytes, { toText: true });
  return new TextDecoder().decode(bytes);
}
