-- Player profiles for account-based games (Duelo Arcano). Idempotent: db:setup re-runs every migration.
-- Server-only (ADR-06 / §12.3): RLS on with no policies and no grants, so the Data API exposes nothing.
-- Rows are created lazily by the server (src/lib/auth.ts ensureProfile), not by a trigger on auth.users.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists profiles_username_lower_uniq on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

notify pgrst, 'reload schema';
