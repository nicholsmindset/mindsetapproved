-- Product submissions that agree with the text a product ends up with (by consensus or admin acceptance)
-- are marked accepted, so they don't linger in the admin's Pending queue; conflicting ones are rejected.

create or replace function public.submit_product(
  p_barcode text, p_ingredients_raw text, p_install_id uuid, p_name text default null, p_brand text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
  norm text;
  agreeing int;
  existing public.products%rowtype;
begin
  if p_barcode !~ '^[0-9]{6,14}$' then
    raise exception 'Invalid barcode' using errcode = '22023';
  end if;
  if p_install_id is null then
    raise exception 'install id required' using errcode = '22023';
  end if;
  if p_ingredients_raw is null or length(btrim(p_ingredients_raw)) = 0 or length(p_ingredients_raw) > 8000 then
    raise exception 'Invalid ingredients text' using errcode = '22023';
  end if;
  select * into existing from public.products where barcode = p_barcode;
  -- Verified, admin and Open Food Facts rows are never touched by submissions.
  if found and (existing.verified or existing.source <> 'user') then
    return 'exists';
  end if;
  who := encode(extensions.digest(p_install_id::text, 'sha256'), 'hex');
  norm := public.norm_key(p_ingredients_raw);
  insert into public.product_submissions as s (barcode, submitter, ingredients_raw, text_norm, name, brand)
  values (p_barcode, who, p_ingredients_raw, norm, left(p_name, 300), left(p_brand, 300))
  on conflict (barcode, submitter) do update
    set ingredients_raw = excluded.ingredients_raw, text_norm = excluded.text_norm,
        name = coalesce(excluded.name, s.name), brand = coalesce(excluded.brand, s.brand),
        status = 'pending', created_at = now();
  select count(distinct submitter) into agreeing
  from public.product_submissions where barcode = p_barcode and text_norm = norm and status <> 'rejected';
  if agreeing >= 2 then
    -- The agreeing submissions are settled: they leave the admin's queue.
    update public.product_submissions set status = 'accepted'
      where barcode = p_barcode and text_norm = norm and status = 'pending';
    insert into public.products as p (barcode, name, brand, ingredients_raw, source, corroborated)
    values (p_barcode, left(p_name, 300), left(p_brand, 300), p_ingredients_raw, 'user', true)
    on conflict (barcode) do update
      set ingredients_raw = excluded.ingredients_raw, corroborated = true,
          name = coalesce(p.name, excluded.name), brand = coalesce(p.brand, excluded.brand)
      where not p.verified and p.source = 'user';
    return 'corroborated';
  end if;
  return 'pending';
end;
$$;

create or replace function public.review_product_submission(p_id uuid, p_accept boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s public.product_submissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  select * into s from public.product_submissions where id = p_id;
  if not found then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  update public.product_submissions set status = case when p_accept then 'accepted' else 'rejected' end where id = p_id;
  if p_accept then
    insert into public.products as p (barcode, name, brand, ingredients_raw, source, verified)
    values (s.barcode, s.name, s.brand, s.ingredients_raw, 'user', true)
    on conflict (barcode) do update
      set ingredients_raw = excluded.ingredients_raw, verified = true,
          name = coalesce(excluded.name, p.name), brand = coalesce(excluded.brand, p.brand);
    update public.product_submissions
      set status = case when text_norm = s.text_norm then 'accepted' else 'rejected' end
      where barcode = s.barcode and id <> s.id and status = 'pending';
  end if;
end;
$$;
