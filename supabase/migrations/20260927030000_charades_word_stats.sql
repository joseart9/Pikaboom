-- Play statistics used to rate word difficulty automatically.
--   shown_count   times the word appeared among the 4 options
--   guessed_count times it was the chosen word when "Siguiente equipo" was pressed
--   failed_count  times the bomb exploded while it was being acted
alter table public.charades_words
  add column if not exists shown_count integer not null default 0,
  add column if not exists guessed_count integer not null default 0,
  add column if not exists failed_count integer not null default 0;

-- Applies a batch of game events atomically. Only the server (direct Postgres) calls this.
create or replace function public.charades_record_events(ids bigint[], kinds text[])
returns integer
language sql
set search_path = ''
as $$
  with ev as (
    select e.id, e.kind from unnest(ids, kinds) as e(id, kind)
    where e.kind in ('shown', 'guessed', 'failed')
  ), agg as (
    select id,
      count(*) filter (where kind = 'shown')::int as s,
      count(*) filter (where kind = 'guessed')::int as g,
      count(*) filter (where kind = 'failed')::int as f
    from ev group by id
  ), upd as (
    update public.charades_words w
    set shown_count = w.shown_count + agg.s,
        guessed_count = w.guessed_count + agg.g,
        failed_count = w.failed_count + agg.f
    from agg
    where w.id = agg.id and w.active
    returning 1
  )
  select count(*)::int from upd
$$;

revoke execute on function public.charades_record_events(bigint[], text[]) from public, anon, authenticated;

notify pgrst, 'reload schema';
