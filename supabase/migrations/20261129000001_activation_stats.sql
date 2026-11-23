-- First-week habit measure for the admin: of the phones that scanned for the first time in a given week, how many
-- checked 3+ products in their first 7 days, and how many came back in days 8-14. Aggregates only; no per-phone output.
-- Admin only. Supabase grants new functions to anon/authenticated by default, so the grants are set explicitly.
create or replace function public.activation_stats(p_weeks int default 8)
returns table (cohort_week date, installs int, reached_three int, returned_week2 int)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return query
  with firsts as (
    select s.install_id, min(s.created_at) as first_at
    from public.scans s
    where s.install_id is not null
    group by s.install_id
  ), per as (
    select
      f.first_at,
      count(*) filter (where s.created_at < f.first_at + interval '7 days') as n_week1,
      coalesce(bool_or(s.created_at >= f.first_at + interval '7 days' and s.created_at < f.first_at + interval '14 days'), false) as back
    from firsts f
    join public.scans s on s.install_id = f.install_id
    group by f.install_id, f.first_at
  )
  select
    date_trunc('week', per.first_at)::date,
    count(*)::int,
    (count(*) filter (where per.n_week1 >= 3))::int,
    (count(*) filter (where per.back))::int
  from per
  where per.first_at >= date_trunc('week', now()) - make_interval(weeks => greatest(least(p_weeks, 26), 1))
  group by 1
  order by 1;
end;
$$;
revoke execute on function public.activation_stats(int) from public, anon, authenticated;
grant execute on function public.activation_stats(int) to authenticated;
