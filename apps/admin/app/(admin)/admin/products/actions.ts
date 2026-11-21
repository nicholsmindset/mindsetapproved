'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { isBarcode } from '@/lib/safe-path';

export async function saveProduct(form: FormData) {
  const { supabase } = await requireAdmin();
  const barcode = String(form.get('barcode'));
  if (!isBarcode(barcode)) redirect('/admin/products?error=Invalid%20barcode');
  const path = `/admin/products/${barcode}`;
  const ingredients = String(form.get('ingredients_raw') ?? '').trim();
  if (!ingredients) redirect(`${path}?error=${encodeURIComponent('Ingredients text is required.')}`);
  const { error } = await supabase
    .from('products')
    .update({
      name: String(form.get('name') ?? '').trim() || null,
      brand: String(form.get('brand') ?? '').trim() || null,
      ingredients_raw: ingredients,
      verified: form.get('verified') === 'on',
      is_active: form.get('is_active') === 'on',
      source: 'admin',
    })
    .eq('barcode', barcode);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent('Saved. The app uses this text on the next scan of this barcode.')}`);
}

export async function reviewSubmission(form: FormData) {
  const { supabase } = await requireAdmin();
  const accept = form.get('decision') === 'accept';
  const { error } = await supabase.rpc('review_product_submission', { p_id: String(form.get('id')), p_accept: accept });
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/products');
  redirect(`/admin/products?ok=${encodeURIComponent(accept ? 'Accepted: phones now use this text for that barcode.' : 'Rejected.')}`);
}
