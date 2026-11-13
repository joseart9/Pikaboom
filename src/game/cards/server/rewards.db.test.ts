// Phase 16 I: `cards_grant_match_rewards` on PGlite — amounts, every anti-farm rule, idempotency, the ledger, the
// version bump, the lockdown for client roles, and the match service granting through it end to end.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ECONOMY } from "../config/economy";
import { applyMigrations, createTestDb, createTestUser } from "../testing/pglite";
import { finishMulligan, GUEST, HOST, makeService, req, startMatch, STRANGER, userOf } from "../testing/server";
import { PgMatchStore } from "./pgStore";
import { PgRewards, type RewardConfig } from "./rewards";

let db: PGlite;
let rewards: PgRewards;

beforeAll(async () => {
  db = await createTestDb();
  rewards = new PgRewards(db);
  await createTestUser(db, HOST, "Ana");
  await createTestUser(db, GUEST, "Beto");
  await createTestUser(db, STRANGER, "Ceci");
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`truncate public.cards_matches, public.cards_wallets, public.cards_currency_transactions cascade`);
});

let codeCounter = 0;

interface MatchInput {
  host?: string;
  guest?: string | null;
  status?: string;
  winner?: string | null;
  result?: "win" | "draw";
  endReason?: string;
  totalTurns?: number;
}

/** Inserts a match row directly (default: finished, HOST beat GUEST in 12 turns). */
async function insertMatch(o: MatchInput = {}): Promise<string> {
  const host = o.host ?? HOST;
  const guest = o.guest === undefined ? GUEST : o.guest;
  const result = o.result ?? "win";
  const winner = o.winner === undefined ? (result === "draw" ? null : host) : o.winner;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.cards_matches (code, status, host_id, guest_id, host_name, guest_name, lobby, winner_id, result, end_reason, total_turns, finished_at)
     values ($1, $2, $3, $4, 'Ana', 'Beto', '{}'::jsonb, $5, $6, $7, $8, now()) returning id`,
    [`R${String(++codeCounter).padStart(5, "0")}`, o.status ?? "finished", host, guest, winner, result, o.endReason ?? "concede", o.totalTurns ?? 12],
  );
  return rows[0].id;
}

/** A finished match, granted. Returns its id. */
async function play(o: MatchInput = {}): Promise<string> {
  const id = await insertMatch(o);
  await rewards.grantMatchRewards(id);
  return id;
}

async function reward(matchId: string, userId: string) {
  return rewards.getMatchReward(matchId, userId);
}

async function balance(userId: string): Promise<number | null> {
  const { rows } = await db.query<{ balance: number }>(`select balance from public.cards_wallets where user_id = $1`, [userId]);
  return rows[0]?.balance ?? null;
}

async function ledger(userId?: string) {
  const { rows } = await db.query<{ user_id: string; amount: number; balance_after: number; kind: string; ref: string; idempotency_key: string }>(
    `select user_id, amount, balance_after, kind, ref, idempotency_key from public.cards_currency_transactions
      ${userId ? "where user_id = $1" : ""} order by id`,
    userId ? [userId] : [],
  );
  return rows;
}

async function matchRow(id: string) {
  const { rows } = await db.query<{ version: number; granted: boolean }>(
    `select version, rewards_granted_at is not null as granted from public.cards_matches where id = $1`,
    [id],
  );
  return rows[0];
}

/** Seeds an already-paid reward row (an earlier match today, or `daysAgo` days back). */
async function seedReward(userId: string, opponentId: string, amount: number, reason: string, daysAgo = 0): Promise<void> {
  const id = await insertMatch({ host: userId, guest: opponentId });
  await db.query(
    `insert into public.cards_match_rewards (match_id, user_id, opponent_id, amount, reason, created_at)
     values ($1, $2, $3, $4, $5, now() - $6::integer * interval '1 day')`,
    [id, userId, opponentId, amount, reason, daysAgo],
  );
}

describe("cards_grant_match_rewards (Phase 16 I)", () => {
  it("1: winner host in 12 turns → host +100 win_first, guest +20 loss; 2 ledger rows; version bumped", async () => {
    const id = await insertMatch();
    const before = await matchRow(id);
    await rewards.grantMatchRewards(id);
    expect(await reward(id, HOST)).toEqual({ amount: 100, reason: "win_first" });
    expect(await reward(id, GUEST)).toEqual({ amount: 20, reason: "loss" });
    expect(await balance(HOST)).toBe(100);
    expect(await balance(GUEST)).toBe(20);
    const rows = await ledger();
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r).toMatchObject({ kind: "match_reward", ref: id, idempotency_key: `match:${id}` });
    expect(rows.find((r) => r.user_id === HOST)).toMatchObject({ amount: 100, balance_after: 100 });
    const after = await matchRow(id);
    expect(after).toEqual({ version: before.version + 1, granted: true });
    const { rows: wallet } = await db.query(`select lifetime_earned from public.cards_wallets where user_id = $1`, [HOST]);
    expect(wallet).toEqual([{ lifetime_earned: 100 }]);
  });

  it("2: granting twice changes nothing the second time (nor does a concurrent call)", async () => {
    const id = await play();
    const version = (await matchRow(id)).version;
    await rewards.grantMatchRewards(id);
    await Promise.all([rewards.grantMatchRewards(id), rewards.grantMatchRewards(id)]);
    expect(await balance(HOST)).toBe(100);
    expect(await balance(GUEST)).toBe(20);
    expect(await ledger()).toHaveLength(2);
    expect((await matchRow(id)).version).toBe(version);

    const other = await insertMatch();
    await Promise.all([rewards.grantMatchRewards(other), rewards.grantMatchRewards(other), rewards.grantMatchRewards(other)]);
    expect(await ledger()).toHaveLength(4);
    expect(await reward(other, HOST)).toEqual({ amount: 50, reason: "win" });
  });

  it("3: fewer than minTotalTurns → both 0 too_short, no ledger rows; exactly minTotalTurns is rewarded", async () => {
    const short = await play({ totalTurns: 5 });
    expect(await reward(short, HOST)).toEqual({ amount: 0, reason: "too_short" });
    expect(await reward(short, GUEST)).toEqual({ amount: 0, reason: "too_short" });
    expect(await ledger()).toEqual([]);
    expect(await balance(HOST)).toBeNull();
    expect((await matchRow(short)).granted).toBe(true);

    const edge = await play({ totalTurns: ECONOMY.rewards.minTotalTurns });
    expect(await reward(edge, HOST)).toEqual({ amount: 100, reason: "win_first" });
  });

  it("4: the loser of an abandon gets nothing; the winner is paid", async () => {
    const id = await play({ endReason: "abandon" });
    expect(await reward(id, GUEST)).toEqual({ amount: 0, reason: "abandon" });
    expect(await reward(id, HOST)).toEqual({ amount: 100, reason: "win_first" });
    expect(await ledger(GUEST)).toEqual([]);
  });

  it("5: the 6th rewarded match vs the same opponent the same day → 0 opponent_limit (both players)", async () => {
    for (let i = 0; i < ECONOMY.rewards.perOpponentDailyLimit; i++) await play();
    const sixth = await play();
    expect(await reward(sixth, HOST)).toEqual({ amount: 0, reason: "opponent_limit" });
    expect(await reward(sixth, GUEST)).toEqual({ amount: 0, reason: "opponent_limit" });
    expect(await balance(HOST)).toBe(100 + 4 * 50);
    expect(await balance(GUEST)).toBe(5 * 20);
    // Another opponent is still rewarded.
    const fresh = await play({ guest: STRANGER });
    expect(await reward(fresh, HOST)).toEqual({ amount: 50, reason: "win" });
  });

  it("6: the second win of the day has no bonus", async () => {
    await play();
    const second = await play();
    expect(await reward(second, HOST)).toEqual({ amount: 50, reason: "win" });
    expect(await balance(HOST)).toBe(150);
  });

  it("7: daily cap — earlier rewards summing 390 → the next win pays 10, then 0 daily_cap", async () => {
    for (const amount of [100, 100, 100, 90]) await seedReward(HOST, STRANGER, amount, "win");
    const first = await play();
    expect(await reward(first, HOST)).toEqual({ amount: 10, reason: "win" });
    const second = await play();
    expect(await reward(second, HOST)).toEqual({ amount: 0, reason: "daily_cap" });
    expect((await ledger(HOST)).map((r) => r.amount)).toEqual([10]);
    expect(await reward(second, GUEST)).toEqual({ amount: 20, reason: "loss" }); // the guest's own cap is untouched
  });

  it("8: draw → both 25", async () => {
    const id = await play({ result: "draw", endReason: "turn_limit", totalTurns: 50 });
    expect(await reward(id, HOST)).toEqual({ amount: 25, reason: "draw" });
    expect(await reward(id, GUEST)).toEqual({ amount: 25, reason: "draw" });
  });

  it("rewards from an earlier UTC day count for nothing (bonus, opponent limit, cap)", async () => {
    await seedReward(HOST, GUEST, 400, "win", 1);
    for (let i = 0; i < 5; i++) await seedReward(HOST, GUEST, 50, "win", 2);
    const id = await play();
    expect(await reward(id, HOST)).toEqual({ amount: 100, reason: "win_first" });
  });

  it("only finished matches with a guest are rewarded", async () => {
    for (const status of ["active", "abandoned", "cancelled", "lobby"]) {
      const id = await play({ status, winner: null });
      expect(await reward(id, HOST)).toBeNull();
      expect((await matchRow(id)).granted).toBe(false);
    }
    const noGuest = await play({ guest: null, winner: null });
    expect(await reward(noGuest, HOST)).toBeNull();
    await rewards.grantMatchRewards("00000000-0000-4000-8000-0000000000ff"); // unknown id: no error
    expect(await ledger()).toEqual([]);
  });

  it("amounts come only from the config passed in (ECONOMY.rewards by default)", async () => {
    const custom: RewardConfig = { ...ECONOMY.rewards, win: 7, loss: 3, firstWinOfDayBonus: 0 };
    const id = await insertMatch();
    await new PgRewards(db, custom).grantMatchRewards(id);
    expect(await reward(id, HOST)).toEqual({ amount: 7, reason: "win_first" });
    expect(await reward(id, GUEST)).toEqual({ amount: 3, reason: "loss" });
  });

  it("credits an existing wallet and keeps the ledger consistent", async () => {
    await db.query(`insert into public.cards_wallets (user_id, balance, lifetime_earned) values ($1, 300, 300)`, [HOST]);
    await play();
    expect(await balance(HOST)).toBe(400);
    expect(await ledger(HOST)).toEqual([expect.objectContaining({ amount: 100, balance_after: 400 })]);
  });

  it("deleting a match cascades to its reward rows", async () => {
    const id = await play();
    await db.query(`delete from public.cards_matches where id = $1`, [id]);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cards_match_rewards where match_id = $1`, [id]);
    expect(rows[0].n).toBe(0);
  });

  it("the migrations can be applied again (db:setup re-runs them)", async () => {
    await applyMigrations(db);
    const id = await play();
    expect(await reward(id, HOST)).toEqual({ amount: 100, reason: "win_first" });
  });
});

describe("privileges (9, §12.3)", () => {
  for (const role of ["anon", "authenticated"]) {
    it(`${role} has no privilege on cards_match_rewards`, async () => {
      const { rows } = await db.query<Record<string, boolean>>(
        `select has_table_privilege($1, 'public.cards_match_rewards', 'select') as s, has_table_privilege($1, 'public.cards_match_rewards', 'insert') as i,
                has_table_privilege($1, 'public.cards_match_rewards', 'update') as u, has_table_privilege($1, 'public.cards_match_rewards', 'delete') as d`,
        [role],
      );
      expect(rows[0]).toEqual({ s: false, i: false, u: false, d: false });
    });

    it(`${role} cannot execute cards_grant_match_rewards`, async () => {
      const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, 'public.cards_grant_match_rewards(uuid,jsonb)', 'execute') as ok`, [role]);
      expect(rows[0].ok).toBe(false);
    });
  }

  it("a client role calling the function is denied", async () => {
    const id = await insertMatch();
    await db.exec(`set role authenticated`);
    try {
      await expect(db.query(`select public.cards_grant_match_rewards($1::uuid, '{"win": 999999}'::jsonb)`, [id])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
    expect(await ledger()).toEqual([]);
  });

  it("RLS is enabled; the function is not security definer and pins search_path", async () => {
    const { rows: rls } = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'cards_match_rewards' and relkind = 'r'`);
    expect(rls).toEqual([{ relrowsecurity: true }]);
    const { rows } = await db.query<{ prosecdef: boolean; proconfig: string[] | null }>(`select prosecdef, proconfig from pg_proc where proname = 'cards_grant_match_rewards'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(false);
    expect(rows[0].proconfig).toContain('search_path=""');
  });
});

describe("match service + Postgres rewards (end to end)", () => {
  it("a full match finished by concession pays both players once; refreshes do not pay again", async () => {
    const t = makeService({ store: () => new PgMatchStore(db), rewards: () => new PgRewards(db) });
    const { matchId: id } = await startMatch(t);
    let s = await finishMulligan(t, id);
    while (s.turn.number < ECONOMY.rewards.minTotalTurns) {
      await t.service.submitCommand(id, userOf(s.turn.activeSeat), req({ t: "endTurn" }));
      s = (await t.store.load(id))!.state!;
    }
    const done = await t.service.submitCommand(id, GUEST, req({ t: "concede" }));
    expect(done.status).toBe("finished");
    expect(done.rewards).toEqual({ amount: 20, reason: "loss" });
    expect(done.version).toBe((await t.store.load(id))!.version);

    const host = await t.service.readMatch(id, HOST, { knownVersion: done.version - 1 });
    expect(host).toMatchObject({ view: { rewards: { amount: 100, reason: "win_first" } } });
    await t.service.readMatch(id, HOST);
    await t.service.readMatch(id, GUEST);
    expect(await balance(HOST)).toBe(100);
    expect(await balance(GUEST)).toBe(20);
    expect(await ledger()).toHaveLength(2);
  });

  it("a short match shows the too_short reason to both players", async () => {
    const t = makeService({ store: () => new PgMatchStore(db), rewards: () => new PgRewards(db) });
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    const done = await t.service.submitCommand(id, HOST, req({ t: "concede" }));
    expect(done.rewards).toEqual({ amount: 0, reason: "too_short" });
    expect(await ledger()).toEqual([]);
  });
});
