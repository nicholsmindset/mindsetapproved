'use server';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { hasSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

export interface CorrectionState {
  ok?: boolean;
  error?: string;
}

/** Shared with the database (public.app_secrets row 'corrections'); at least 32 characters. */
const SECRET = process.env.CORRECTIONS_SECRET ?? '';

/**
 * Stores a correction through submit_correction(). The sender is identified only by a keyed hash of their IP and
 * the day (not reversible without the server secret), and the hash is signed so the database can tell the request
 * came from this website.
 */
export async function sendCorrection(_prev: CorrectionState, form: FormData): Promise<CorrectionState> {
  if (String(form.get('website') ?? '')) return { ok: true }; // honeypot: bots fill every field
  if (!hasSupabase || SECRET.length < 32) return { error: 'Corrections are not connected yet. Please try again later.' };
  const h = await headers();
  // x-real-ip is set by the host (Vercel); the first x-forwarded-for entry can be supplied by the client.
  const ip = h.get('x-real-ip') || (h.get('x-forwarded-for') ?? '').split(',').pop()!.trim() || 'unknown';
  const senderHash = createHmac('sha256', SECRET).update(`${ip}|${new Date().toISOString().slice(0, 10)}`).digest('hex');
  const signature = createHmac('sha256', SECRET).update(senderHash).digest('hex');
  const product = String(form.get('product') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const barcode = String(form.get('barcode') ?? '').replace(/\D/g, '');
  const email = String(form.get('email') ?? '').trim();
  if (!product) return { error: 'Tell us which product this is about.' };
  if (message.length < 10) return { error: 'Please describe the correction (at least 10 characters).' };
  if (barcode && (barcode.length < 6 || barcode.length > 14)) return { error: 'That barcode doesn’t look right.' };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.rpc('submit_correction', {
    p_kind: form.get('kind') === 'manufacturer' ? 'manufacturer' : 'shopper',
    p_product: product,
    p_message: message,
    p_sender_hash: senderHash,
    p_signature: signature,
    p_barcode: barcode || null,
    p_contact_email: email || null,
  });
  if (error) return { error: error.code === 'P0001' ? error.message : 'We couldn’t save that. Check the fields and try again.' };
  return { ok: true };
}
