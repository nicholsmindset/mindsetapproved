'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export async function saveProduct(form: FormData) {
  const { supabase } = await requireAdmin();
  const barcode = String(form.get('barcode'));
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
