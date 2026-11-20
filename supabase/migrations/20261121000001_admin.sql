-- Admin dashboard support: scan source for hit-rate stats, unmatched-term mapping, stats RPC.

-- Where the ingredient text came from: products cache, Open Food Facts, on-device OCR, or AI re-check.
alter table public.scans add column source text check (source in ('cache', 'off', 'label', 'ai'));

-- Map an unknown term to an ingredient: adds the alias and closes the queue item in one step.
create or replace function public.map_unmatched(p_term text, p_ingredient_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_code boolean := public.e_code(p_term) is not null;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  insert into public.aliases (alias, alias_norm, ingredient_id, kind)
  values (p_term, '', p_ingredient_id, case when is_code then 'e_number' else 'name' end::public.alias_kind)
  on conflict (alias_norm) do nothing;
  if not found and not exists (
    select 1 from public.aliases
    where alias_norm = case when is_code then public.e_code(p_term) else public.norm_key(p_term) end
      and ingredient_id = p_ingredient_id
  ) then
    raise exception '"%" is already an alias of another ingredient', p_term using errcode = '23505';
  end if;
  update public.unmatched_terms
     set status = 'added', mapped_ingredient_id = p_ingredient_id
   where term_norm = public.norm_key(p_term);
end;
$$;

-- Dashboard numbers for the last p_days days.
-- scans.matched is the app's list of matched chips: [{"ingredientId": "...", "tier": "bad", ...}].
create or replace function public.admin_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'days', p_days,
    'scans_total', (select count(*) from public.scans where created_at >= since),
    'scans_per_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'count', n) order by d)
      from (select created_at::date as d, count(*) as n from public.scans where created_at >= since group by 1) s), '[]'::jsonb),
    'verdict_mix', coalesce((
      select jsonb_object_agg(verdict, n)
      from (select verdict, count(*) as n from public.scans where created_at >= since group by 1) s), '{}'::jsonb),
    'source_mix', coalesce((
      select jsonb_object_agg(coalesce(source, 'unknown'), n)
      from (select source, count(*) as n from public.scans where created_at >= since group by 1) s), '{}'::jsonb),
    'top_flagged', coalesce((
      select jsonb_agg(jsonb_build_object('ingredient_id', id, 'count', n) order by n desc, id)
      from (
        select m ->> 'ingredientId' as id, count(*) as n
        from public.scans s, jsonb_array_elements(case when jsonb_typeof(s.matched) = 'array' then s.matched else '[]'::jsonb end) m
        where s.created_at >= since and m ->> 'tier' in ('bad', 'borderline')
        group by 1 order by 2 desc, 1 limit 15
      ) t), '[]'::jsonb),
    'unmatched_new', (select count(*) from public.unmatched_terms where status = 'new'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'reports_total', (select count(*) from public.reports where created_at >= since),
    'products', (select count(*) from public.products),
    'latest_version', (select max(version) from public.rule_versions)
  );
end;
$$;

revoke execute on function public.map_unmatched(text, text) from public;
revoke execute on function public.admin_stats(int) from public;
grant execute on function public.map_unmatched(text, text) to authenticated;
grant execute on function public.admin_stats(int) to authenticated;
