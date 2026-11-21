-- Behaviour checks run after migrations + seed (scripts/check-sql.sh). Any failure raises.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');

-- seed loaded
do $$ begin
  assert (select count(*) from public.ingredients where is_active) >= 57, 'expected the starter ingredients';
  assert (select count(*) from public.aliases) >= 547, format('expected the starter aliases, got %s', (select count(*) from public.aliases));
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
select public.log_unmatched(array['Zzqx Powder', 'zzqx powder', 'E1520'], 'zzqx powder, sugar');
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
  values ('test_dye', 'Test Dye X', 'dye', 'bad', 'bad', 'Test Dye X is a synthetic dye used only in tests.', true);
insert into public.aliases (alias, alias_norm, ingredient_id, kind) values ('Test Dye X', '', 'test_dye', 'name'), ('E999', '', 'test_dye', 'e_number');
do $$
declare r jsonb := public.export_rules();
begin
  assert jsonb_array_length(r -> 'ingredients') = (select count(*) from public.ingredients where is_active), 'export includes every active ingredient';
  assert exists (select 1 from jsonb_array_elements(r -> 'ingredients') x where x ->> 'id' = 'test_dye'), 'export includes the new ingredient';
  assert (select alias_norm from public.aliases where alias = 'E999') = 'e999', 'e_number trigger';
  begin
    insert into public.aliases (alias, alias_norm, ingredient_id, kind) values ('test dye x', '', 'red_40', 'name');
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
  perform public.publish_rule_version(2, 'https://example.invalid/rules-bundle.v2.json.gz', 72, 1225, 'test');
  begin
    perform public.publish_rule_version(2, 'x', 1, 1);
    raise exception 'republished same version';
  exception when invalid_parameter_value then null;
  end;
end $$;
-- admin: unmatched mapping and stats
insert into public.scans (verdict, source, matched) values
  ('not_approved', 'off', '[{"ingredientId": "canola_oil", "tier": "bad"}, {"ingredientId": "salt", "tier": "neutral"}]'),
  ('caution', 'label', '[{"ingredientId": "added_sugar", "tier": "borderline"}]'),
  ('not_approved', 'label', '[{"ingredientId": "canola_oil", "tier": "bad"}]');
select public.map_unmatched('zzqx powder', 'salt');
select public.map_unmatched('E1520', 'lecithin');
do $$
declare s jsonb := public.admin_stats(30);
begin
  assert (select status from public.unmatched_terms where term_norm = 'zzqx powder') = 'added', 'map_unmatched status';
  assert (select ingredient_id from public.aliases where alias_norm = 'zzqx powder') = 'salt', 'map_unmatched alias';
  assert (select kind from public.aliases where alias_norm = 'e1520') = 'e_number', 'map_unmatched code';
  begin
    perform public.map_unmatched('canola oil', 'salt');
    raise exception 'remapped an existing alias';
  exception when unique_violation then null;
  end;
  perform public.map_unmatched('canola oil', 'canola_oil'); -- same ingredient: no-op
  assert (s ->> 'scans_total')::int >= 3, 'stats total';
  assert (s -> 'top_flagged' -> 0 ->> 'ingredient_id') = 'canola_oil', 'stats top flagged';
  assert (s -> 'top_flagged' -> 0 ->> 'count')::int = 2, 'stats top flagged count';
  assert (s -> 'source_mix' ->> 'label')::int = 2, 'stats source mix';
  assert (s ->> 'latest_version')::int = 2, 'stats latest version';
end $$;
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
do $$ begin
  begin
    perform public.admin_stats(30);
    raise exception 'non-admin read stats';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.map_unmatched('x', 'salt');
    raise exception 'non-admin mapped a term';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role anon;
set request.jwt.claims = '{}';
do $$ begin
  assert (select version from public.latest_rule_version()) = 2, 'anon reads latest version';
end $$;

-- mobile: AI limits and delete by install id
insert into public.scans (id, install_id, verdict) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'caution'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'approved');
insert into public.reports (scan_id, reason) values ('10000000-0000-0000-0000-000000000001', 'wrong');
do $$ begin
  assert public.use_ai_recheck('20000000-0000-0000-0000-000000000001', 3) = 2, 'first AI use leaves 2';
  assert public.use_ai_recheck('20000000-0000-0000-0000-000000000001', 3) = 1, 'second leaves 1';
  assert public.use_ai_recheck('20000000-0000-0000-0000-000000000001', 3) = 0, 'third leaves 0';
  assert public.use_ai_recheck('20000000-0000-0000-0000-000000000001', 3) = -1, 'fourth refused';
  assert public.use_ai_recheck('20000000-0000-0000-0000-000000000002', 3) = 2, 'limits are per install';
  assert (select count(*) from public.ai_usage) = 0, 'anon cannot read ai_usage';
  assert public.delete_install_data('20000000-0000-0000-0000-000000000001') = 1, 'deleted one scan';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from public.scans where id = '10000000-0000-0000-0000-000000000001'), 'scan deleted';
  assert not exists (select 1 from public.reports r where r.scan_id = '10000000-0000-0000-0000-000000000001'), 'report cascaded';
  assert exists (select 1 from public.scans where id = '10000000-0000-0000-0000-000000000002'), 'other install kept';
  assert (select count from public.ai_usage where subject = 'install:20000000-0000-0000-0000-000000000001') is null, 'usage deleted';
  assert (select count from public.ai_usage where subject = 'install:20000000-0000-0000-0000-000000000002') = 1, 'other usage kept';
end $$;
set role anon;
reset role;
-- shares and accounts
insert into public.scans (id, install_id, verdict, barcode, matched) values
  ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'not_approved', '9556001234567',
   '[{"ingredientId": "canola_oil", "tier": "bad"}, {"ingredientId": "salt", "tier": "neutral"}, {"ingredientId": "avocado_oil", "tier": "good"}, {"ingredientId": "made_up", "tier": "bad"}]');
insert into public.products (barcode, name, ingredients_raw, source, verified) values ('9556001234567', 'Wafers', 'x', 'user', false)
  on conflict (barcode) do update set name = 'Wafers', verified = false, source = 'user';
set role anon;
set request.jwt.claims = '{}';
do $$
declare c text; c2 text; v jsonb;
begin
  begin
    perform public.share_verdict('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000009');
    raise exception 'shared someone else''s scan';
  exception when no_data_found then null;
  end;
  c := public.share_verdict('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');
  c2 := public.share_verdict('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');
  assert c = c2 and length(c) = 8, 'share code stable and 8 chars';
  v := public.get_shared_verdict(c);
  assert v ->> 'verdict' = 'not_approved', 'share verdict';
  assert jsonb_array_length(v -> 'chips') = 2, format('neutral and unknown ids dropped: %s', v -> 'chips');
  assert v -> 'chips' -> 0 ->> 'name' = 'Canola / rapeseed oil', 'bad first, with name';
  assert v ->> 'product_name' is null, 'unverified product name hidden';
  assert (select count(*) from public.shared_verdicts) = 0, 'anon cannot list shares';
  assert public.get_shared_verdict('nope') is null, 'unknown code';
end $$;
reset role;
update public.products set verified = true where barcode = '9556001234567';
set role anon;
do $$ begin
  assert public.get_shared_verdict((select public.share_verdict('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'))) ->> 'product_name' = 'Wafers', 'verified name shown';
  begin
    perform public.claim_install('40000000-0000-0000-0000-000000000001');
    raise exception 'anon claimed scans';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
do $$ begin
  assert public.claim_install('40000000-0000-0000-0000-000000000001') = 1, 'claimed one scan';
  assert (select count(*) from public.scans where id = '30000000-0000-0000-0000-000000000001') = 1, 'user now reads the claimed scan';
end $$;
select public.delete_my_data();
reset role;
do $$ begin
  assert not exists (select 1 from public.shared_verdicts where scan_id = '30000000-0000-0000-0000-000000000001'), 'delete-my-data removes shares';
end $$;
-- corrections and history sync
set role anon;
set request.jwt.claims = '{}';
do $$
declare i int;
begin
  for i in 1..5 loop
    perform public.submit_correction('manufacturer', 'Crunchy Corn Chips', 'Our recipe changed in 2026; it no longer contains Red 40.', 'abcdef0123456789abcdef', '9556001000017', 'qa@example.test');
  end loop;
  begin
    perform public.submit_correction('shopper', 'X', 'This is the sixth message.', 'abcdef0123456789abcdef');
    raise exception 'rate limit not enforced';
  exception when raise_exception then null;
  end;
  perform public.submit_correction('shopper', 'Y', 'Another sender is fine.', 'fedcba9876543210fedcba');
  begin
    perform public.submit_correction('shopper', 'Y', 'short', 'fedcba9876543210fedcba');
    raise exception 'short message accepted';
  exception when check_violation then null;
  end;
  assert (select count(*) from public.corrections) = 0, 'anon cannot read corrections';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.corrections) = 6, 'six corrections stored';
end $$;
insert into public.scans (id, user_id, verdict) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'caution');
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
do $$ begin
  begin
    perform public.update_my_scan('50000000-0000-0000-0000-000000000001', true);
    raise exception 'updated another user''s scan';
  exception when no_data_found then null;
  end;
end $$;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select public.update_my_scan('50000000-0000-0000-0000-000000000001', true, 'Ingredients: water', 'approved');
reset role;
do $$ begin
  assert (select favourite and verdict = 'approved' from public.scans where id = '50000000-0000-0000-0000-000000000001'), 'own scan updated';
end $$;
\echo 'All SQL checks passed'
