-- Mobile app support: anonymous installs, AI re-check limits, delete-my-data without an account.

-- Random id generated on the phone; links an install's anonymous scans. Not personal data on its own.
alter table public.scans add column install_id uuid;
create index scans_install_idx on public.scans (install_id) where install_id is not null;

-- Daily AI re-check counter per install (or signed-in user).
create table public.ai_usage (
  subject text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (subject, day)
);
alter table public.ai_usage enable row level security;
create policy "admin reads ai usage" on public.ai_usage for select to authenticated using ((select public.is_admin()));

-- Called by the ocr-fallback Edge Function before each AI call. Returns the uses left today after this
-- one, or -1 when the limit is already reached (nothing is counted then).
create or replace function public.use_ai_recheck(p_install_id uuid, p_limit int default 3)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  subj text := coalesce(auth.uid()::text, 'install:' || p_install_id::text);
  used int;
begin
  if p_install_id is null and auth.uid() is null then
    raise exception 'install id required' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;
  insert into public.ai_usage as a (subject, day, count) values (subj, current_date, 1)
  on conflict (subject, day) do update set count = a.count + 1 where a.count < p_limit
  returning count into used;
  if used is null then
    return -1;
  end if;
  return p_limit - used;
end;
$$;

-- PDPA delete-my-data for an install that never signed in. The install id is a random secret kept on the phone.
create or replace function public.delete_install_data(p_install_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if p_install_id is null then
    raise exception 'install id required' using errcode = '22023';
  end if;
  delete from public.scans where install_id = p_install_id; -- reports cascade
  get diagnostics n = row_count;
  delete from public.ai_usage where subject = 'install:' || p_install_id::text;
  return n;
end;
$$;

revoke execute on function public.use_ai_recheck(uuid, int) from public;
revoke execute on function public.delete_install_data(uuid) from public;
grant execute on function public.use_ai_recheck(uuid, int) to anon, authenticated;
grant execute on function public.delete_install_data(uuid) to anon, authenticated;
