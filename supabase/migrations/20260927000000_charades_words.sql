-- Word bank for the Charades mini game.
create table if not exists public.charades_words (
  id bigint generated always as identity primary key,
  word text not null unique,
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.charades_words enable row level security;

-- Anyone (anon or signed-in) can read active words; nobody can write via the Data API.
drop policy if exists "Public can read active words" on public.charades_words;
create policy "Public can read active words"
  on public.charades_words for select
  to anon, authenticated
  using (active);

grant select on public.charades_words to anon, authenticated;

notify pgrst, 'reload schema';
