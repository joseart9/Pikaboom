-- +18 word set: words flagged adult are only used when the +18 switch is on.
alter table public.charades_words add column if not exists adult boolean not null default false;
create index if not exists charades_words_adult_active_idx on public.charades_words (adult) where active;

notify pgrst, 'reload schema';
