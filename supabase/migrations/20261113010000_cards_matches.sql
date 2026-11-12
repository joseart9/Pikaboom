-- Duelo Arcano online matches (Phase 9, §12.2 / §13.4). Idempotent: db:setup re-runs every migration.
-- Server-only (ADR-06 / §12.3): RLS on with no policies and every grant revoked, so the Data API exposes nothing.
-- The route handlers reach these tables through the trusted `pg` connection (src/lib/db.ts) only.

create table if not exists public.cards_matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby','active','finished','abandoned','cancelled')),
  host_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid references public.profiles (id) on delete cascade,
  host_name text not null,
  guest_name text,
  lobby jsonb not null,
  state jsonb,
  setup jsonb,
  version integer not null default 1,
  turn_deadline timestamptz,
  seen_host timestamptz,
  seen_guest timestamptz,
  winner_id uuid references public.profiles (id),
  result text check (result in ('win','draw')),
  end_reason text,
  total_turns integer not null default 0,
  rewards_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint cards_matches_distinct_players check (guest_id is null or guest_id <> host_id)
);
create index if not exists cards_matches_host_open_idx  on public.cards_matches (host_id)  where status in ('lobby','active');
create index if not exists cards_matches_guest_open_idx on public.cards_matches (guest_id) where status in ('lobby','active');
create index if not exists cards_matches_status_updated_idx on public.cards_matches (status, updated_at);

create table if not exists public.cards_match_commands (
  match_id uuid not null references public.cards_matches (id) on delete cascade,
  command_id text not null,
  seq integer not null,
  user_id uuid,
  seat smallint not null check (seat in (0,1)),
  command jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, command_id)
);
create index if not exists cards_match_commands_seq_idx on public.cards_match_commands (match_id, seq);

alter table public.cards_matches enable row level security;
alter table public.cards_match_commands enable row level security;
revoke all on table public.cards_matches, public.cards_match_commands from anon, authenticated;

notify pgrst, 'reload schema';
