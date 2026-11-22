-- Supabase grants EXECUTE on new public functions to anon, authenticated and service_role explicitly
-- (default privileges), so "revoke ... from public" alone left them callable by everyone. Found by the
-- Supabase security advisor on the first real deploy. Each function keeps only the roles it was meant for.

-- Service-role only: AI quota bookkeeping (a phone refunding itself would mean unlimited AI re-checks).
revoke execute on function public.refund_ai_recheck(uuid) from anon, authenticated;
revoke execute on function public.use_ai_recheck(uuid, int) from anon, authenticated;

-- Signed-in only (each also checks auth.uid() or is_admin() inside).
revoke execute on function public.delete_my_data() from anon;
revoke execute on function public.claim_install(uuid) from anon;
revoke execute on function public.update_my_scan(uuid, boolean, text, public.verdict) from anon;
revoke execute on function public.export_rules() from anon;
revoke execute on function public.publish_rule_version(int, text, int, int, text) from anon;
revoke execute on function public.map_unmatched(text, text) from anon;
revoke execute on function public.admin_stats(int) from anon;
revoke execute on function public.review_product_submission(uuid, boolean) from anon;

-- Secrets are read only by SECURITY DEFINER functions; RLS already hides every row, this removes the grant too.
revoke all on table public.app_secrets from anon, authenticated;
