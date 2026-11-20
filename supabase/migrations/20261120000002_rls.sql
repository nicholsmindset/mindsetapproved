-- Row-level security. The app can only read published bundles and active products, insert its own
-- scans and reports, and read/write its own settings. Only the admin role edits rules.
-- Grant admin by setting app_metadata.role = 'admin' on the user (service role / dashboard only).

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

alter table public.categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.aliases enable row level security;
alter table public.rule_versions enable row level security;
alter table public.products enable row level security;
alter table public.scans enable row level security;
alter table public.unmatched_terms enable row level security;
alter table public.reports enable row level security;
alter table public.user_settings enable row level security;

-- Rules tables: admin only. Phones get rules through the published bundle.
create policy "admin manages categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages ingredients" on public.ingredients
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages aliases" on public.aliases
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages unmatched terms" on public.unmatched_terms
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Published bundles: anyone can read; admin publishes.
create policy "anyone reads rule versions" on public.rule_versions
  for select to anon, authenticated using (true);
create policy "admin publishes rule versions" on public.rule_versions
  for insert to authenticated with check ((select public.is_admin()));

-- Products cache: anyone reads active products; admin edits. Phones add products via submit_product().
create policy "anyone reads active products" on public.products
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admin manages products" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Scans: insert your own (or anonymous); read your own; admin reads all.
create policy "insert own scans" on public.scans
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "read own scans" on public.scans
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "delete own scans" on public.scans
  for delete to authenticated using (user_id = (select auth.uid()));

-- Reports: insert your own; read your own; admin manages all.
create policy "insert own reports" on public.reports
  for insert to anon, authenticated
  with check (status = 'open' and (user_id is null or user_id = (select auth.uid())));
create policy "read own reports" on public.reports
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admin resolves reports" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Settings: your own row only.
create policy "own settings" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Bundle files: public bucket (read by URL), admin-only writes.
insert into storage.buckets (id, name, public)
values ('rules-bundles', 'rules-bundles', true)
on conflict (id) do nothing;

create policy "admin uploads rules bundles" on storage.objects
  for insert to authenticated with check (bucket_id = 'rules-bundles' and (select public.is_admin()));
create policy "admin updates rules bundles" on storage.objects
  for update to authenticated using (bucket_id = 'rules-bundles' and (select public.is_admin()));
create policy "admin deletes rules bundles" on storage.objects
  for delete to authenticated using (bucket_id = 'rules-bundles' and (select public.is_admin()));
