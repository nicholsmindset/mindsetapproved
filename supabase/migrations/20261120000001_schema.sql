-- Mindset Approved: core schema.
-- Supabase Postgres is the source of truth and the admin editing surface; phones match against
-- a compiled rules bundle (see packages/rules-engine compileBundle), never against these tables.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.tier as enum ('good', 'neutral', 'borderline', 'bad');
create type public.alias_kind as enum ('name', 'e_number', 'ocr_misspelling');
create type public.product_source as enum ('off', 'user', 'admin');
create type public.verdict as enum ('approved', 'caution', 'not_approved', 'cant_verify');
create type public.unmatched_status as enum ('new', 'added', 'ignored');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- Mirrors normKey() in packages/rules-engine/src/normalize.ts. The bundle compiler recomputes
-- keys from alias text, so the compiler stays authoritative; this column is for uniqueness and search.
create or replace function public.norm_key(input text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[''’`]', '', 'g'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- Mirrors eCode(): "E150c" -> "e150c", "INS 129" -> "e129", "E322(i)" -> "e322". Null if not a code.
create or replace function public.e_code(input text)
returns text
language sql
stable
set search_path = ''
as $$
  select case when m is null then null else 'e' || m[1] || coalesce(m[2], '') end
  from (select regexp_match(public.norm_key(input),
    '^(?:e|ins) ?(?:no )?(\d{3,4}) ?([a-h])? ?(?:i{1,3}|iv|vi?)?$') as m) s
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Groups for user toggles
create table public.categories (
  id text primary key,
  label text not null,
  toggleable boolean not null default true,
  sort_order int not null default 0
);

-- One row per canonical ingredient. Rows imported from the OFF taxonomy arrive with tier = null
-- and is_active = false; only rows the admin gives a tier can be activated.
create table public.ingredients (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  display_name text not null,
  short_name text,
  category text not null references public.categories (id),
  tier public.tier,
  strict_tier public.tier,
  reason_short text not null default '',
  reason_long text,
  learn_more_url text,
  e_number text,
  off_tag text unique,
  -- {"regulator": [...], "preference": [...]}: regulator facts kept apart from opinion sources
  sources jsonb not null default '{"regulator": [], "preference": []}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_needs_tier check (not is_active or (tier is not null and strict_tier is not null)),
  constraint flagged_needs_reason check (
    not is_active or (tier = 'neutral' and strict_tier = 'neutral') or length(btrim(reason_short)) > 0
  )
);
create index ingredients_category_idx on public.ingredients (category);
create trigger ingredients_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();

-- Every way an ingredient is written
create table public.aliases (
  id bigint generated always as identity primary key,
  alias text not null,
  alias_norm text not null unique,
  ingredient_id text not null references public.ingredients (id) on delete cascade,
  lang text not null default 'en',
  kind public.alias_kind not null default 'name',
  created_at timestamptz not null default now()
);
create index aliases_ingredient_idx on public.aliases (ingredient_id);
create index aliases_norm_trgm_idx on public.aliases using gin (alias_norm extensions.gin_trgm_ops);

create or replace function public.aliases_set_norm()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'e_number' then
    new.alias_norm := public.e_code(new.alias);
    if new.alias_norm is null then
      raise exception 'Not a valid E-number alias: %', new.alias using errcode = '22023';
    end if;
  else
    new.alias_norm := public.norm_key(new.alias);
  end if;
  if new.alias_norm = '' then
    raise exception 'Alias normalises to an empty string: %', new.alias using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger aliases_norm before insert or update of alias, kind on public.aliases
  for each row execute function public.aliases_set_norm();

-- Published bundles
create table public.rule_versions (
  version int primary key,
  published_at timestamptz not null default now(),
  bundle_url text not null,
  ingredient_count int not null,
  alias_count int not null,
  notes text,
  published_by uuid references auth.users (id) on delete set null
);

-- Cached barcode results
create table public.products (
  barcode text primary key check (barcode ~ '^[0-9]{6,14}$'),
  name text,
  brand text,
  ingredients_raw text not null,
  source public.product_source not null,
  verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Analytics. No photos are stored.
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  barcode text,
  ocr_text text check (length(ocr_text) <= 8000),
  ocr_confidence real check (ocr_confidence between 0 and 1),
  verdict public.verdict not null,
  matched jsonb not null default '[]'::jsonb,
  rules_version int,
  created_at timestamptz not null default now()
);
create index scans_user_idx on public.scans (user_id, created_at desc);
create index scans_created_idx on public.scans (created_at desc);

-- Review queue of unknown words
create table public.unmatched_terms (
  term_norm text primary key,
  count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  example_label text,
  status public.unmatched_status not null default 'new',
  mapped_ingredient_id text references public.ingredients (id) on delete set null
);
create index unmatched_terms_queue_idx on public.unmatched_terms (status, count desc);

-- Users flag wrong verdicts
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  reason text not null check (length(reason) <= 200),
  comment text check (length(comment) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_queue_idx on public.reports (status, created_at desc);

-- Synced preferences
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  strict_mode boolean not null default false,
  no_gelatin boolean not null default false,
  disabled_categories text[] not null default '{}',
  disabled_ingredients text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
