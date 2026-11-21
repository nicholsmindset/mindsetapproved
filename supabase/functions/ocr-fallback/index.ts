// ocr-fallback: "Re-check with AI". Reads the ingredient list from a label photo with Gemini and
// returns structured text. It never decides a verdict: the phone runs the rules engine on the result.
// The photo is processed in memory and never stored.
//
// POST { "image": "<base64 jpeg>", "mimeType"?: "image/jpeg", "installId": "<uuid>" }
// Secrets: GEMINI_API_KEY. Optional: GEMINI_MODEL (default gemini-2.5-flash-lite), AI_DAILY_LIMIT (default 3),
// GEMINI_BASE_URL (tests only).
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { geminiRequest, parseGemini } from './gemini.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const body = (await req.json().catch(() => null)) as { image?: string; mimeType?: string; installId?: string } | null;
  if (!body?.image || typeof body.image !== 'string') return json({ error: 'image is required' }, 400);
  if (!body.installId || !UUID.test(body.installId)) return json({ error: 'installId is required' }, 400);
  const mimeType = body.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  if ((body.image.length * 3) / 4 > MAX_IMAGE_BYTES) return json({ error: 'Image too large; send at most 4 MB' }, 413);

  // Count this use first (per install, or per user when signed in), with the caller's own credentials.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` } },
    auth: { persistSession: false },
  });
  const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 3);
  const { data: left, error: limitError } = await supabase.rpc('use_ai_recheck', { p_install_id: body.installId, p_limit: limit });
  if (limitError) return json({ error: limitError.message }, 500);
  if (left === -1) return json({ error: `You've used today's ${limit} AI re-checks.`, remaining: 0 }, 429);

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';
  const base = Deno.env.get('GEMINI_BASE_URL') ?? 'https://generativelanguage.googleapis.com';
  const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '' },
    body: JSON.stringify(geminiRequest(body.image, mimeType)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`gemini ${res.status}: ${detail.slice(0, 500)}`);
    return json({ error: 'The AI service could not read this photo. Try again or edit the text.' }, 502);
  }
  try {
    return json({ ...parseGemini(await res.json()), remaining: left });
  } catch (e) {
    console.error(`gemini parse: ${(e as Error).message}`);
    return json({ error: 'The AI answer was not usable. Try again or edit the text.' }, 502);
  }
});
