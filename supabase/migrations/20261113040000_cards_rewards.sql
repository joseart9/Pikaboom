-- Duelo Arcano — match rewards (Phase 16, §6.12, §16.5). Idempotent: safe to run any number of times.
-- One row per (match, player) records what a finished match paid out (0 with a reason when an anti-farm rule applied).
-- `cards_grant_match_rewards` computes every amount in SQL from server-written match columns, credits the wallet and
-- writes the ledger, then stamps `cards_matches.rewards_granted_at` and bumps the match version so polling clients
-- receive the view that now contains the rewards. Amounts come only from `p_cfg` (= `ECONOMY.rewards`).
-- Security (§12.3): RLS on with no policies, every privilege revoked from client roles, the function is not
-- security definer and cannot be executed by client roles. Only the server (database owner) calls it.

create table if not exists public.cards_match_rewards (
  match_id uuid not null references public.cards_matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid,
  amount integer not null check (amount >= 0),
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
create index if not exists cards_match_rewards_user_day_idx on public.cards_match_rewards (user_id, created_at);

-- Single and idempotent: the match row lock serializes concurrent callers, `rewards_granted_at` makes later calls
-- no-ops, and the (match_id, user_id) primary key + the ledger's (user_id, idempotency_key) unique key back that up.
create or replace function public.cards_grant_match_rewards(p_match_id uuid, p_cfg jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.cards_matches%rowtype;
  v_user uuid; v_opp uuid; v_amount integer; v_reason text;
  v_count integer; v_today integer; v_balance integer; v_rows integer;
  v_day timestamptz := date_trunc('day', now(), 'UTC');
begin
  select * into m from public.cards_matches where id = p_match_id for update;
  if not found or m.status <> 'finished' or m.rewards_granted_at is not null or m.guest_id is null then return; end if;
  for v_user in select u from unnest(array[m.host_id, m.guest_id]) as u order by u loop
    v_opp := case when v_user = m.host_id then m.guest_id else m.host_id end;
    if m.total_turns < (p_cfg->>'minTotalTurns')::integer then v_amount := 0; v_reason := 'too_short';
    elsif m.result = 'draw' then v_amount := (p_cfg->>'draw')::integer; v_reason := 'draw';
    elsif m.winner_id = v_user then v_amount := (p_cfg->>'win')::integer; v_reason := 'win';
    elsif m.end_reason = 'abandon' and (p_cfg->>'abandonLoserGetsNothing')::boolean then v_amount := 0; v_reason := 'abandon';
    else v_amount := (p_cfg->>'loss')::integer; v_reason := 'loss';
    end if;
    if v_amount > 0 then
      select count(*) into v_count from public.cards_match_rewards
       where user_id = v_user and opponent_id = v_opp and amount > 0 and created_at >= v_day;
      if v_count >= (p_cfg->>'perOpponentDailyLimit')::integer then v_amount := 0; v_reason := 'opponent_limit'; end if;
    end if;
    if v_amount > 0 and v_reason = 'win' and not exists (
      select 1 from public.cards_match_rewards where user_id = v_user and reason in ('win','win_first') and created_at >= v_day) then
      v_amount := v_amount + (p_cfg->>'firstWinOfDayBonus')::integer; v_reason := 'win_first';
    end if;
    if v_amount > 0 then
      select coalesce(sum(amount), 0) into v_today from public.cards_match_rewards where user_id = v_user and created_at >= v_day;
      v_amount := least(v_amount, greatest(0, (p_cfg->>'dailyCap')::integer - v_today));
      if v_amount = 0 then v_reason := 'daily_cap'; end if;
    end if;
    insert into public.cards_match_rewards (match_id, user_id, opponent_id, amount, reason)
    values (p_match_id, v_user, v_opp, v_amount, v_reason) on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 1 and v_amount > 0 then
      insert into public.cards_wallets (user_id) values (v_user) on conflict (user_id) do nothing;
      update public.cards_wallets set balance = balance + v_amount, lifetime_earned = lifetime_earned + v_amount, updated_at = now()
       where user_id = v_user returning balance into v_balance;
      insert into public.cards_currency_transactions (user_id, amount, balance_after, kind, ref, idempotency_key)
      values (v_user, v_amount, v_balance, 'match_reward', p_match_id::text, 'match:' || p_match_id::text);
    end if;
  end loop;
  -- bump version so clients polling with ?v= receive the view that now contains rewards
  update public.cards_matches set rewards_granted_at = now(), version = version + 1, updated_at = now() where id = p_match_id;
end
$$;

alter table public.cards_match_rewards enable row level security;
revoke all on table public.cards_match_rewards from anon, authenticated;
revoke execute on function public.cards_grant_match_rewards(uuid, jsonb) from public, anon, authenticated;
notify pgrst, 'reload schema';
