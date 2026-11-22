-- Covering indexes for foreign keys flagged by the Supabase performance advisor (deletes of a user or
-- ingredient otherwise scan these tables).
create index if not exists reports_user_idx on public.reports (user_id);
create index if not exists rule_versions_published_by_idx on public.rule_versions (published_by);
create index if not exists unmatched_terms_mapped_idx on public.unmatched_terms (mapped_ingredient_id);
