-- Multilingual labels: keep CJK ideographs, Japanese kana and Korean Hangul in normalised keys, exactly like
-- normKey() in packages/rules-engine/src/normalize.ts (an explicit character set, so the result doesn't depend
-- on the database locale).
create or replace function public.norm_key(input text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(normalize(extensions.unaccent(coalesce(input, '')), NFC)), '[''’`]', '', 'g'),
    '[^a-z0-9぀-ヺー-ヿ㐀-䶿一-鿿가-힯豈-﫿]+', ' ', 'g'))
$$;

-- Recompute stored keys (the aliases trigger runs on update of alias).
update public.aliases set alias = alias;
