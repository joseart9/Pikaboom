-- Duelo Arcano — card packs (Phase 17, §12.2, §16.3–§16.5). Idempotent: safe to run any number of times.
-- `cards_pack_openings` is the purchase history and the idempotency record; `cards_purchase_pack` does the whole
-- purchase in one transaction: replay check → conditional debit → opening → ledger → inventory upsert.
-- The cards are rolled by the server in TypeScript (node:crypto, ADR-09) and passed in; the function never decides
-- the contents. Security (§12.3): RLS on with no policies, every privilege revoked from anon/authenticated, the
-- function is not security definer and cannot be executed by client roles.

create table if not exists public.cards_pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_type text not null,
  price integer not null check (price > 0),
  cards text[] not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists cards_pack_openings_user_idx on public.cards_pack_openings (user_id, created_at desc);

-- Same key again → the stored opening (`replayed: true`), nothing written. Not enough Oro (or no wallet) →
-- `insufficient_funds`, nothing written. Two concurrent calls with the same key: the second one's opening insert hits
-- the unique constraint (23505) and rolls back entirely; the server then re-reads the opening by key.
create or replace function public.cards_purchase_pack(p_user uuid, p_pack text, p_price integer, p_cards text[], p_key text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare v_existing public.cards_pack_openings%rowtype; v_balance integer; v_id uuid;
begin
  if p_price <= 0 or coalesce(array_length(p_cards, 1), 0) = 0 then raise exception 'invalid_pack' using errcode = 'P0001'; end if;
  select * into v_existing from public.cards_pack_openings where user_id = p_user and idempotency_key = p_key;
  if found then
    select balance into v_balance from public.cards_wallets where user_id = p_user;
    return jsonb_build_object('openingId', v_existing.id, 'cards', to_jsonb(v_existing.cards), 'balance', v_balance, 'replayed', true);
  end if;
  update public.cards_wallets set balance = balance - p_price, updated_at = now()
   where user_id = p_user and balance >= p_price returning balance into v_balance;
  if not found then raise exception 'insufficient_funds' using errcode = 'P0001'; end if;
  insert into public.cards_pack_openings (user_id, pack_type, price, cards, idempotency_key)
  values (p_user, p_pack, p_price, p_cards, p_key) returning id into v_id;
  insert into public.cards_currency_transactions (user_id, amount, balance_after, kind, ref, idempotency_key)
  values (p_user, -p_price, v_balance, 'pack_purchase', v_id::text, 'pack:' || p_key);
  insert into public.cards_inventory (user_id, card_id, quantity)
  select p_user, c, count(*)::integer from unnest(p_cards) as c group by c
  on conflict (user_id, card_id) do update set quantity = public.cards_inventory.quantity + excluded.quantity, updated_at = now();
  return jsonb_build_object('openingId', v_id, 'cards', to_jsonb(p_cards), 'balance', v_balance, 'replayed', false);
end
$$;

alter table public.cards_pack_openings enable row level security;
revoke all on table public.cards_pack_openings from anon, authenticated;
revoke execute on function public.cards_purchase_pack(uuid, text, integer, text[], text) from public, anon, authenticated;
notify pgrst, 'reload schema';
