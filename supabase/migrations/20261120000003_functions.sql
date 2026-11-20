-- RPCs the app and admin call. SECURITY DEFINER functions validate their own input and
-- run with an empty search_path.

-- App: count unknown terms from a scan (text only, never photos). The app cannot write the table directly.
create or replace function public.log_unmatched(terms text[], example text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  if terms is null then return; end if;
  if array_length(terms, 1) > 50 then
    raise exception 'Too many terms (max 50)' using errcode = '22023';
  end if;
  foreach t in array terms loop
    t := public.norm_key(t);
    continue when t = '' or length(t) > 80;
    insert into public.unmatched_terms as u (term_norm, example_label)
    values (t, left(example, 500))
    on conflict (term_norm) do update
      set count = u.count + 1,
          last_seen = now(),
          example_label = coalesce(u.example_label, excluded.example_label);
  end loop;
end;
$$;

-- App: save confirmed ingredients for a barcode so the next scan is instant.
-- Never overwrites a verified or admin product.
create or replace function public.submit_product(
  p_barcode text, p_ingredients_raw text, p_name text default null, p_brand text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_barcode !~ '^[0-9]{6,14}$' then
    raise exception 'Invalid barcode' using errcode = '22023';
  end if;
  if p_ingredients_raw is null or length(btrim(p_ingredients_raw)) = 0 or length(p_ingredients_raw) > 8000 then
    raise exception 'Invalid ingredients text' using errcode = '22023';
  end if;
  insert into public.products as p (barcode, name, brand, ingredients_raw, source)
  values (p_barcode, left(p_name, 300), left(p_brand, 300), p_ingredients_raw, 'user')
  on conflict (barcode) do update
    set ingredients_raw = excluded.ingredients_raw,
        name = coalesce(p.name, excluded.name),
        brand = coalesce(p.brand, excluded.brand)
    where not p.verified and p.source <> 'admin';
end;
$$;

-- App (PDPA): delete everything tied to the signed-in user.
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from public.reports where user_id = uid;
  delete from public.scans where user_id = uid;
  delete from public.user_settings where user_id = uid;
end;
$$;

-- Admin: active rules as JSON in the compileBundle() input shape (minus version).
create or replace function public.export_rules()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label, 'toggleable', c.toggleable) order by c.sort_order, c.id)
      from public.categories c), '[]'::jsonb),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'display_name', i.display_name, 'short_name', i.short_name, 'category', i.category,
        'tier', i.tier, 'strict_tier', i.strict_tier, 'reason_short', i.reason_short,
        'learn_more_url', i.learn_more_url, 'is_active', i.is_active) order by i.id)
      from public.ingredients i where i.is_active), '[]'::jsonb),
    'aliases', coalesce((
      select jsonb_agg(jsonb_build_object('alias', a.alias, 'ingredient_id', a.ingredient_id, 'kind', a.kind, 'lang', a.lang) order by a.id)
      from public.aliases a join public.ingredients i on i.id = a.ingredient_id where i.is_active), '[]'::jsonb)
  );
end;
$$;

-- Admin: record a published bundle after uploading it to the rules-bundles bucket.
create or replace function public.publish_rule_version(
  p_version int, p_bundle_url text, p_ingredient_count int, p_alias_count int, p_notes text default null
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  if p_version <= coalesce((select max(version) from public.rule_versions), 0) then
    raise exception 'Version % is not newer than the latest published version', p_version using errcode = '22023';
  end if;
  insert into public.rule_versions (version, bundle_url, ingredient_count, alias_count, notes, published_by)
  values (p_version, p_bundle_url, p_ingredient_count, p_alias_count, p_notes, auth.uid());
  return p_version;
end;
$$;

-- App: latest published bundle (checked on each app open).
create or replace function public.latest_rule_version()
returns setof public.rule_versions
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.rule_versions order by version desc limit 1
$$;

revoke execute on function public.log_unmatched(text[], text) from public;
revoke execute on function public.submit_product(text, text, text, text) from public;
revoke execute on function public.delete_my_data() from public;
revoke execute on function public.export_rules() from public;
revoke execute on function public.publish_rule_version(int, text, int, int, text) from public;

grant execute on function public.log_unmatched(text[], text) to anon, authenticated;
grant execute on function public.submit_product(text, text, text, text) to anon, authenticated;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.export_rules() to authenticated;
grant execute on function public.publish_rule_version(int, text, int, int, text) to authenticated;
grant execute on function public.latest_rule_version() to anon, authenticated;
