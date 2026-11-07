-- Batalla Naval rooms. The app also creates this table automatically on first use
-- (src/game/battleship/rooms.ts), so running this migration is optional.
create table if not exists public.battleship_rooms (
  code text primary key,
  version integer not null default 1,
  state jsonb not null,
  seen0 timestamptz,
  seen1 timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only the server (direct Postgres connection) touches this table; no public API access.
alter table public.battleship_rooms enable row level security;

create index if not exists battleship_rooms_updated_at_idx on public.battleship_rooms (updated_at);
