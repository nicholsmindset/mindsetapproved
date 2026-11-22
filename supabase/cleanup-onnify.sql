-- Removes the earlier copy of Mindset Approved from the Onnify Growth OS project (hombnfjwqhheyyvwemlk).
-- Mindset now has its own project (ywunhcftvroykiquejpg), so these objects in Onnify are unused.
--
-- Run ONCE, in the Onnify project's SQL editor. It only touches Mindset objects: none of these names is used
-- by Onnify (checked when Mindset was added). It deliberately keeps public.set_updated_at(), which Onnify's
-- own triggers use, and the pg_trgm / unaccent extensions, which are harmless to keep.
-- Everything runs in one transaction: if any statement fails, nothing is removed.
begin;

-- Tables first (their policies and triggers go with them)
drop table if exists public.ai_usage cascade;
drop table if exists public.aliases cascade;
drop table if exists public.app_secrets cascade;
drop table if exists public.categories cascade;
drop table if exists public.corrections cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.product_submissions cascade;
drop table if exists public.products cascade;
drop table if exists public.reports cascade;
drop table if exists public.rule_versions cascade;
drop table if exists public.scans cascade;
drop table if exists public.shared_verdicts cascade;
drop table if exists public.unmatched_terms cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.mindset_applied_migrations;

-- Storage policies for the rules bundle bucket (they use is_admin(), so they go before the functions)
drop policy if exists "admin deletes rules bundles" on storage.objects;
drop policy if exists "admin updates rules bundles" on storage.objects;
drop policy if exists "admin uploads rules bundles" on storage.objects;

-- Functions (not set_updated_at, which Onnify uses)
drop function if exists public.admin_stats(p_days integer);
drop function if exists public.aliases_set_norm();
drop function if exists public.claim_install(p_install_id uuid);
drop function if exists public.delete_install_data(p_install_id uuid);
drop function if exists public.delete_my_data();
drop function if exists public.e_code(input text);
drop function if exists public.export_rules();
drop function if exists public.get_shared_verdict(p_code text);
drop function if exists public.is_admin();
drop function if exists public.latest_rule_version();
drop function if exists public.log_unmatched(terms text[], example text);
drop function if exists public.map_unmatched(p_term text, p_ingredient_id text);
drop function if exists public.norm_key(input text);
drop function if exists public.publish_rule_version(p_version integer, p_bundle_url text, p_ingredient_count integer, p_alias_count integer, p_notes text);
drop function if exists public.refund_ai_recheck(p_install_id uuid);
drop function if exists public.review_product_submission(p_id uuid, p_accept boolean);
drop function if exists public.share_verdict(p_scan_id uuid, p_install_id uuid);
drop function if exists public.submit_correction(p_kind text, p_product text, p_message text, p_sender_hash text, p_signature text, p_barcode text, p_contact_email text);
drop function if exists public.submit_product(p_barcode text, p_ingredients_raw text, p_install_id uuid, p_name text, p_brand text);
drop function if exists public.update_my_scan(p_scan_id uuid, p_favourite boolean, p_ocr_text text, p_verdict public.verdict);
drop function if exists public.use_ai_recheck(p_install_id uuid, p_limit integer);
drop function if exists public.mindset_apply_file(text, text, text, boolean);

-- Enum types
drop type if exists public.alias_kind;
drop type if exists public.correction_status;
drop type if exists public.product_source;
drop type if exists public.report_status;
drop type if exists public.tier;
drop type if exists public.unmatched_status;
drop type if exists public.verdict;

-- The temporary extension used to load the files
drop extension if exists http;

commit;

-- Finally, in the dashboard: Storage -> delete the empty 'rules-bundles' bucket (Supabase blocks deleting buckets from SQL).
