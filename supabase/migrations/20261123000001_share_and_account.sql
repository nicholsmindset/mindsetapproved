-- Shareable verdict pages and optional accounts.

create extension if not exists pgcrypto with schema extensions;

-- A shared verdict is a snapshot of one of the sharer's own scans. It is built from the scans row on the
-- server, never from free text sent by the client, so a share link can't put invented claims next to a
-- product name. Verdicts describe ingredients only.
create table public.shared_verdicts (
  code text primary key,
  scan_id uuid not null unique references public.scans (id) on delete cascade, -- delete-my-data removes shares
  verdict public.verdict not null,
  chips jsonb not null default '[]'::jsonb,
  barcode text,
  rules_version int,
  created_at timestamptz not null default now()
);
alter table public.shared_verdicts enable row level security;
create policy "admin reads shares" on public.shared_verdicts for select to authenticated using ((select public.is_admin()));

-- Creates (or returns) the share code for a scan the caller made: same install id, or same signed-in user.
create or replace function public.share_verdict(p_scan_id uuid, p_install_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.scans%rowtype;
  c text;
begin
  select * into s from public.scans where id = p_scan_id;
  if not found or not (
    (p_install_id is not null and s.install_id = p_install_id) or (auth.uid() is not null and s.user_id = auth.uid())
  ) then
    raise exception 'scan not found' using errcode = 'P0002';
  end if;
  select code into c from public.shared_verdicts where scan_id = p_scan_id;
  if c is not null then
    return c;
  end if;
  loop
    c := translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_');
    exit when not exists (select 1 from public.shared_verdicts where code = c);
  end loop;
  insert into public.shared_verdicts (code, scan_id, verdict, chips, barcode, rules_version)
  values (
    c,
    s.id,
    s.verdict,
    coalesce((
      select jsonb_agg(jsonb_build_object('ingredient_id', m ->> 'ingredientId', 'tier', m ->> 'tier'))
      from jsonb_array_elements(case when jsonb_typeof(s.matched) = 'array' then s.matched else '[]'::jsonb end) m
      join public.ingredients i on i.id = m ->> 'ingredientId'
      where m ->> 'tier' in ('good', 'borderline', 'bad')
    ), '[]'::jsonb),
    s.barcode,
    s.rules_version
  );
  return c;
end;
$$;

-- Public read of one share, with ingredient names and reasons. A product name is shown only when an admin
-- has verified the product, so user-entered names never appear on a public page.
create or replace function public.get_shared_verdict(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', v.code,
    'verdict', v.verdict,
    'created_at', v.created_at,
    'rules_version', v.rules_version,
    'product_name', p.name,
    'brand', p.brand,
    'chips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredient_id', i.id, 'name', i.display_name, 'short_name', coalesce(i.short_name, i.display_name),
        'tier', c ->> 'tier', 'reason', i.reason_short)
        order by case c ->> 'tier' when 'bad' then 0 when 'borderline' then 1 else 2 end, i.display_name)
      from jsonb_array_elements(v.chips) c
      join public.ingredients i on i.id = c ->> 'ingredient_id'
    ), '[]'::jsonb)
  )
  from public.shared_verdicts v
  left join public.products p on p.barcode = v.barcode and (p.verified or p.source = 'admin') and p.is_active
  where v.code = p_code
$$;

-- On sign-in: attach this install's anonymous scans to the account, so history and delete-my-data follow the user.
create or replace function public.claim_install(p_install_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.scans set user_id = auth.uid() where install_id = p_install_id and user_id is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.share_verdict(uuid, uuid) from public;
revoke execute on function public.get_shared_verdict(text) from public;
revoke execute on function public.claim_install(uuid) from public;
grant execute on function public.share_verdict(uuid, uuid) to anon, authenticated;
grant execute on function public.get_shared_verdict(text) to anon, authenticated;
grant execute on function public.claim_install(uuid) to authenticated;
