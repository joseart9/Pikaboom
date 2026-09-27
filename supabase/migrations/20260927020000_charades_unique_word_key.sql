-- No repeated words, regardless of case, accents, extra spaces, category or +18 set.
create extension if not exists unaccent with schema extensions;

create or replace function public.charades_word_key(w text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(btrim(extensions.unaccent('extensions.unaccent'::regdictionary, w)), '\s+', ' ', 'g'))
$$;

create unique index if not exists charades_words_word_key_uniq
  on public.charades_words (public.charades_word_key(word));
