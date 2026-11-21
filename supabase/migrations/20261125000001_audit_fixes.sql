-- Security audit fixes.

-- 1. Products cache: one install can no longer change what everyone sees for a barcode.
--    Submissions are kept per install; a product is served to others only once two different installs
--    submitted the same text, or an admin accepted it.
alter table public.products add column corroborated boolean not null default false;

create table public.product_submissions (
  id uuid primary key default gen_random_uuid(),
  barcode text not null check (barcode ~ '^[0-9]{6,14}$'),
  /** sha256 of the submitting install id; the install id itself stays on the phone. */
  submitter text not null,
  ingredients_raw text not null check (length(ingredients_raw) between 1 and 8000),
  text_norm text not null,
  name text check (length(name) <= 300),
  brand text check (length(brand) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (barcode, submitter)
);
create index product_submissions_queue_idx on public.product_submissions (status, created_at desc);
alter table public.product_submissions enable row level security;
create policy "admin manages product submissions" on public.product_submissions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy "anyone reads active products" on public.products;
create policy "anyone reads trusted products" on public.products
  for select to anon, authenticated
  using ((is_active and (verified or corroborated or source <> 'user')) or (select public.is_admin()));

revoke execute on function public.submit_product(text, text, text, text) from anon, authenticated;
drop function public.submit_product(text, text, text, text);

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
revoke execute on function public.submit_product(text, text, uuid, text, text) from public;
grant execute on function public.submit_product(text, text, uuid, text, text) to anon, authenticated;

-- Admin: accept a submission as the product's text (verified) or reject it.
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
    update public.product_submissions set status = 'rejected'
      where barcode = s.barcode and id <> s.id and status = 'pending' and text_norm <> s.text_norm;
  end if;
end;
$$;
revoke execute on function public.review_product_submission(uuid, boolean) from public;
grant execute on function public.review_product_submission(uuid, boolean) to authenticated;

-- 2. Corrections: only the website (which holds the secret) can submit, so the per-sender limit can't be
--    bypassed by calling the RPC directly with made-up sender hashes. Plus a global daily cap.
create table public.app_secrets (
  name text primary key,
  value text not null check (length(value) >= 32)
);
alter table public.app_secrets enable row level security; -- no policies: unreadable except to definer functions

revoke execute on function public.submit_correction(text, text, text, text, text, text) from anon, authenticated;
drop function public.submit_correction(text, text, text, text, text, text);

create or replace function public.submit_correction(
  p_kind text, p_product text, p_message text, p_sender_hash text, p_signature text,
  p_barcode text default null, p_contact_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text := (select value from public.app_secrets where name = 'corrections');
  new_id uuid;
begin
  if secret is null then
    raise exception 'Corrections are not configured' using errcode = 'P0001';
  end if;
  if p_sender_hash is null or length(p_sender_hash) < 16
     or p_signature is distinct from encode(extensions.hmac(p_sender_hash, secret, 'sha256'), 'hex') then
    raise exception 'invalid sender' using errcode = '42501';
  end if;
  if (select count(*) from public.corrections where sender_hash = p_sender_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many corrections from this connection; try again later.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.corrections where created_at > now() - interval '1 day') >= 500 then
    raise exception 'We’re receiving a lot of corrections right now; please try again tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.corrections (kind, product, barcode, message, contact_email, sender_hash)
  values (p_kind, btrim(p_product), nullif(btrim(coalesce(p_barcode, '')), ''), btrim(p_message), nullif(btrim(coalesce(p_contact_email, '')), ''), p_sender_hash)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.submit_correction(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_correction(text, text, text, text, text, text, text) to anon, authenticated;

-- 3. AI re-check limits: bookkept only by the ocr-fallback Edge Function (service role), with a refund
--    when the AI call fails. Phones can no longer call these directly.
revoke execute on function public.use_ai_recheck(uuid, int) from anon, authenticated;
grant execute on function public.use_ai_recheck(uuid, int) to service_role;

create or replace function public.refund_ai_recheck(p_install_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where subject = 'install:' || p_install_id::text and day = current_date
$$;
revoke execute on function public.refund_ai_recheck(uuid) from public;
grant execute on function public.refund_ai_recheck(uuid) to service_role;

-- 4. Size limits on anonymous writes, so nobody can fill the database with junk.
alter table public.scans add constraint scans_matched_size check (pg_column_size(matched) <= 32768);
alter table public.scans add constraint scans_barcode_format check (barcode is null or barcode ~ '^[0-9]{6,14}$');
alter table public.user_settings add constraint user_settings_sizes check (
  coalesce(array_length(disabled_categories, 1), 0) <= 100 and coalesce(array_length(disabled_ingredients, 1), 0) <= 1000
);
alter table public.reports add constraint reports_one_per_scan unique (scan_id);
