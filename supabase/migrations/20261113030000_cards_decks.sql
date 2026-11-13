-- Duelo Arcano — saved decks (Phase 15, §12.2, §15.2–§15.5). Idempotent: safe to run any number of times.
-- Decks table (max 10 per user, enforced by `cards_create_deck`), the starter-deck grant guard column on the wallet
-- and the starter-deck grant function.
-- Security (§12.3): RLS on with no policies, every privilege revoked from anon/authenticated, the functions are not
-- security definer and cannot be executed by client roles. Only the server (database owner) touches these tables.

create table if not exists public.cards_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  format text not null default 'standard',
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  card_count integer not null default 0 check (card_count between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_decks_user_idx on public.cards_decks (user_id);
alter table public.cards_wallets add column if not exists starter_decks_granted_at timestamptz;

-- Creates a deck unless the user already has `p_max`. Locking the profile row serializes concurrent creates by the
-- same user, so the count cannot be raced past the limit.
create or replace function public.cards_create_deck(p_user uuid, p_name text, p_entries jsonb, p_card_count integer, p_max integer)
returns uuid language plpgsql set search_path = '' as $$
declare v_id uuid; v_count integer;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'no_profile' using errcode = 'P0001'; end if;
  select count(*) into v_count from public.cards_decks where user_id = p_user;
  if v_count >= p_max then raise exception 'deck_limit' using errcode = 'P0001'; end if;
  insert into public.cards_decks (user_id, name, entries, card_count)
  values (p_user, p_name, p_entries, p_card_count) returning id into v_id;
  return v_id;
end $$;

-- Saves the starter decks once per user (guard: `cards_wallets.starter_decks_granted_at`, separate from the card
-- grant so accounts created before Phase 15 still receive them).
create or replace function public.cards_grant_starter_decks(p_user uuid, p_decks jsonb)
returns boolean language plpgsql set search_path = '' as $$
begin
  insert into public.cards_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.cards_wallets set starter_decks_granted_at = now()
   where user_id = p_user and starter_decks_granted_at is null;
  if not found then return false; end if;
  insert into public.cards_decks (user_id, name, entries, card_count)
  select p_user, d->>'name', d->'entries', (d->>'cardCount')::integer from jsonb_array_elements(p_decks) d;
  return true;
end $$;

alter table public.cards_decks enable row level security;
revoke all on table public.cards_decks from anon, authenticated;
revoke execute on function public.cards_create_deck(uuid, text, jsonb, integer, integer) from public, anon, authenticated;
revoke execute on function public.cards_grant_starter_decks(uuid, jsonb) from public, anon, authenticated;
notify pgrst, 'reload schema';
