import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export interface AiAnswer {
  ingredients: string[];
  may_contain: string[];
  language: string;
  remaining: number;
}

export const aiAvailable = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** "Re-check with AI": the ocr-fallback Edge Function reads the photo. The verdict is still decided on the phone. */
export async function aiRecheck(imageBase64: string, installId: string): Promise<AiAnswer> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ocr-fallback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ image: imageBase64, mimeType: 'image/jpeg', installId }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<AiAnswer> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `AI re-check failed (${res.status})`);
  return body as AiAnswer;
}
