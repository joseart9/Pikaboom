-- Duelo Arcano — collection & wallet (Phase 14, §12.2, §15.1–§15.2). Idempotent: safe to run any number of times.
-- Wallet (balance + starter-grant guard), currency ledger, card inventory and the starter-grant function.
-- Security (§12.3): RLS on with no policies, every privilege revoked from anon/authenticated, the function is not
-- security definer and cannot be executed by client roles. Only the server (database owner) touches these tables.

create table if not exists public.cards_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  starter_granted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.cards_currency_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  kind text not null check (kind in ('starter_grant','match_reward','pack_purchase','admin_adjustment')),
  ref text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists cards_currency_transactions_user_idx on public.cards_currency_transactions (user_id, created_at desc);

create table if not exists public.cards_inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id text not null,
  quantity integer not null check (quantity >= 0),
  first_acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- Grants the starter cards and balance once per user. The conditional update on `starter_granted_at` is the guard:
-- a concurrent second call waits for the first one's row lock, then finds the column set and returns false.
create or replace function public.cards_grant_starter(p_user uuid, p_cards jsonb, p_balance integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare v_balance integer;
begin
  insert into public.cards_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.cards_wallets
     set starter_granted_at = now(), balance = balance + p_balance,
         lifetime_earned = lifetime_earned + p_balance, updated_at = now()
   where user_id = p_user and starter_granted_at is null
  returning balance into v_balance;
  if not found then return false; end if;
  if p_balance > 0 then
    insert into public.cards_currency_transactions (user_id, amount, balance_after, kind, ref, idempotency_key)
    values (p_user, p_balance, v_balance, 'starter_grant', null, 'starter');
  end if;
  insert into public.cards_inventory (user_id, card_id, quantity)
  select p_user, e->>'cardId', (e->>'count')::integer from jsonb_array_elements(p_cards) e
  on conflict (user_id, card_id) do update
    set quantity = greatest(public.cards_inventory.quantity, excluded.quantity), updated_at = now();
  return true;
end
$$;

alter table public.cards_wallets enable row level security;
alter table public.cards_currency_transactions enable row level security;
alter table public.cards_inventory enable row level security;
revoke all on table public.cards_wallets, public.cards_currency_transactions, public.cards_inventory from anon, authenticated;
revoke execute on function public.cards_grant_starter(uuid, jsonb, integer) from public, anon, authenticated;
-- The ledger's identity sequence also got Supabase's default grants (nextval would only burn ids, but revoke anyway).
do $$
begin
  execute format('revoke all on sequence %s from anon, authenticated',
                 pg_get_serial_sequence('public.cards_currency_transactions', 'id'));
end
$$;
notify pgrst, 'reload schema';
