-- Public corrections channel (PRD: manufacturer correction channel) and history sync for signed-in users.

create type public.correction_status as enum ('new', 'fixed', 'no_change');

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('manufacturer', 'shopper')),
  product text not null check (length(product) between 1 and 200),
  barcode text check (barcode ~ '^[0-9]{6,14}$'),
  message text not null check (length(message) between 10 and 4000),
  contact_email text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(contact_email) <= 254),
  /** sha256 of the sender's IP + day, for rate limiting only; never the IP itself. */
  sender_hash text not null,
  status public.correction_status not null default 'new',
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index corrections_queue_idx on public.corrections (status, created_at desc);
create index corrections_sender_idx on public.corrections (sender_hash, created_at);
alter table public.corrections enable row level security;
create policy "admin manages corrections" on public.corrections
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Called by the website's server action, which passes a hash of the sender's IP. At most 5 per sender per hour.
create or replace function public.submit_correction(
  p_kind text, p_product text, p_message text, p_sender_hash text, p_barcode text default null, p_contact_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if p_sender_hash is null or length(p_sender_hash) < 16 then
    raise exception 'sender required' using errcode = '22023';
  end if;
  if (select count(*) from public.corrections where sender_hash = p_sender_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many corrections from this connection; try again later.' using errcode = 'P0001';
  end if;
  insert into public.corrections (kind, product, barcode, message, contact_email, sender_hash)
  values (p_kind, btrim(p_product), nullif(btrim(coalesce(p_barcode, '')), ''), btrim(p_message), nullif(btrim(coalesce(p_contact_email, '')), ''), p_sender_hash)
  returning id into new_id;
  return new_id;
end;
$$;

-- History sync: what a signed-in user's history needs beyond the scan itself.
alter table public.scans add column favourite boolean not null default false;
alter table public.scans add column product_name text check (length(product_name) <= 300);
alter table public.scans add column brand text check (length(brand) <= 300);

-- Lets a signed-in user favourite or edit the text of their own scan (they can't update scans directly).
create or replace function public.update_my_scan(p_scan_id uuid, p_favourite boolean default null, p_ocr_text text default null, p_verdict public.verdict default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.scans
     set favourite = coalesce(p_favourite, favourite),
         ocr_text = coalesce(left(p_ocr_text, 8000), ocr_text),
         verdict = coalesce(p_verdict, verdict)
   where id = p_scan_id and user_id = auth.uid();
  if not found then
    raise exception 'scan not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.submit_correction(text, text, text, text, text, text) from public;
revoke execute on function public.update_my_scan(uuid, boolean, text, public.verdict) from public;
grant execute on function public.submit_correction(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_my_scan(uuid, boolean, text, public.verdict) to authenticated;
