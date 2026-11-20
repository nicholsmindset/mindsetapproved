-- Behaviour checks run after migrations + seed (scripts/check-sql.sh). Any failure raises.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');

-- seed loaded
do $$ begin
  assert (select count(*) from public.ingredients where is_active) = 57, 'expected 57 active ingredients';
  assert (select count(*) from public.aliases) = 547, format('expected 547 aliases, got %s', (select count(*) from public.aliases));
  assert public.norm_key('FD&C Red No. 40') = 'fd c red no 40', 'norm_key';
  assert public.norm_key('Purée') = 'puree', 'norm_key accents';
  assert public.e_code('INS No. 129') = 'e129', 'e_code ins';
  assert public.e_code('E322(i)') = 'e322', 'e_code roman';
  assert public.e_code('E150d') = 'e150d', 'e_code letter';
  assert public.e_code('Red 40') is null, 'e_code non-code';
end $$;

-- anon: no rules tables, can read versions/products, insert scans, log unmatched
set role anon;
set request.jwt.claims = '{}';
do $$ begin
  assert (select count(*) from public.ingredients) = 0, 'anon must not read ingredients';
  assert (select count(*) from public.aliases) = 0, 'anon must not read aliases';
end $$;
insert into public.scans (verdict, ocr_text, rules_version) values ('caution', 'sugar, salt', 1);
select public.log_unmatched(array['Zzqx Powder', 'zzqx powder', 'E471'], 'zzqx powder, sugar');
select public.submit_product('9556001234567', 'sugar, salt, palm oil', 'Test biscuit', 'Brand');
do $$ begin
  assert (select count(*) from public.scans) = 0, 'anon must not read scans back';
  assert (select count(*) from public.products) = 1, 'anon reads active products';
end $$;
do $$ begin
  begin
    insert into public.ingredients (id, display_name, category) values ('x', 'x', 'basic');
    raise exception 'anon inserted an ingredient';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.scans (user_id, verdict) values ('00000000-0000-0000-0000-000000000001', 'approved');
    raise exception 'anon inserted a scan for another user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select count from public.unmatched_terms where term_norm = 'zzqx powder') = 2, 'log_unmatched counts';
  assert (select count(*) from public.unmatched_terms) = 2, 'log_unmatched normalises';
end $$;

-- user 1: own settings and scans only
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
insert into public.user_settings (user_id, strict_mode) values ('00000000-0000-0000-0000-000000000001', true);
insert into public.scans (user_id, verdict) values ('00000000-0000-0000-0000-000000000001', 'approved');
do $$ begin
  assert (select count(*) from public.scans) = 1, 'user sees only own scans';
  assert (select count(*) from public.user_settings) = 1, 'user sees own settings';
  begin
    insert into public.user_settings (user_id) values ('00000000-0000-0000-0000-000000000002');
    raise exception 'user wrote another user''s settings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.export_rules();
    raise exception 'non-admin exported rules';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.reports (scan_id, user_id, reason)
  select id, '00000000-0000-0000-0000-000000000001', 'wrong verdict' from public.scans limit 1;
select public.delete_my_data();
do $$ begin
  assert (select count(*) from public.scans) = 0, 'delete_my_data removed scans';
  assert (select count(*) from public.user_settings) = 0, 'delete_my_data removed settings';
end $$;
reset role;

-- admin: edits rules, exports, publishes
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated", "app_metadata": {"role": "admin"}}';
insert into public.ingredients (id, display_name, category, tier, strict_tier, reason_short, is_active)
  values ('ponceau_4r', 'Ponceau 4R', 'dye', 'bad', 'bad', 'Ponceau 4R is a synthetic dye. The EU requires a warning label on foods that contain it.', true);
insert into public.aliases (alias, alias_norm, ingredient_id, kind) values ('Ponceau 4R', '', 'ponceau_4r', 'name'), ('E124', '', 'ponceau_4r', 'e_number');
do $$
declare r jsonb := public.export_rules();
begin
  assert jsonb_array_length(r -> 'ingredients') = 58, 'export includes new ingredient';
  assert (select alias_norm from public.aliases where alias = 'E124') = 'e124', 'e_number trigger';
  begin
    insert into public.aliases (alias, alias_norm, ingredient_id, kind) values ('ponceau 4r', '', 'red_40', 'name');
    raise exception 'duplicate alias_norm accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.aliases (alias, alias_norm, ingredient_id, kind) values ('not a code', '', 'red_40', 'e_number');
    raise exception 'invalid e_number accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.ingredients (id, display_name, category, is_active) values ('no_tier', 'x', 'basic', true);
    raise exception 'active ingredient without tier accepted';
  exception when check_violation then null;
  end;
  perform public.publish_rule_version(2, 'https://example.invalid/rules-bundle.v2.json.gz', 58, 549, 'test');
  begin
    perform public.publish_rule_version(2, 'x', 1, 1);
    raise exception 'republished same version';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;

set role anon;
set request.jwt.claims = '{}';
do $$ begin
  assert (select version from public.latest_rule_version()) = 2, 'anon reads latest version';
end $$;
reset role;
\echo 'All SQL checks passed'
