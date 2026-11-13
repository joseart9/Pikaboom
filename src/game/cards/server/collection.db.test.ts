// Phase 14 I: wallet, ledger, inventory and `cards_grant_starter` on PGlite — idempotency, ledger rows, inventory
// quantities, removed card ids, and the lockdown of every table and the function for client roles.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defineCollectionStoreTests } from "../testing/collectionSuite";
import { createTestDb, createTestUser } from "../testing/pglite";
import { GUEST, HOST } from "../testing/server";
import { starterGrantCards } from "../collection/starterGrant";
import { PgCollectionStore } from "./collection";

let db: PGlite;
let store: PgCollectionStore;

const TABLES = ["public.cards_wallets", "public.cards_currency_transactions", "public.cards_inventory"];

beforeAll(async () => {
  db = await createTestDb();
  store = new PgCollectionStore(db);
  await createTestUser(db, HOST, "Ana");
  await createTestUser(db, GUEST, "Beto");
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`truncate public.cards_wallets, public.cards_currency_transactions, public.cards_inventory, public.cards_decks`);
});

describe("PgCollectionStore (shared contract)", () => {
  defineCollectionStoreTests(() => store, [HOST, GUEST]);
});

describe("cards_grant_starter", () => {
  it("grant twice → second returns false, balance 300, exactly one ledger row", async () => {
    expect(await store.ensureStarterGrant(HOST)).toBe(true);
    expect(await store.ensureStarterGrant(HOST)).toBe(false);
    const wallet = await db.query<{ balance: number; lifetime_earned: number; granted: boolean }>(
      `select balance, lifetime_earned, starter_granted_at is not null as granted from public.cards_wallets where user_id = $1`,
      [HOST],
    );
    expect(wallet.rows).toEqual([{ balance: 300, lifetime_earned: 300, granted: true }]);
    const ledger = await db.query(`select amount, balance_after, kind, ref, idempotency_key from public.cards_currency_transactions where user_id = $1`, [HOST]);
    expect(ledger.rows).toEqual([{ amount: 300, balance_after: 300, kind: "starter_grant", ref: null, idempotency_key: "starter" }]);
  });

  it("concurrent calls → one ledger row", async () => {
    await Promise.all([store.ensureStarterGrant(HOST), store.ensureStarterGrant(HOST)]);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cards_currency_transactions where user_id = $1`, [HOST]);
    expect(rows[0].n).toBe(1);
  });

  it("stores exactly the starter quantities", async () => {
    await store.ensureStarterGrant(HOST);
    const { rows } = await db.query<{ card_id: string; quantity: number }>(`select card_id, quantity from public.cards_inventory where user_id = $1`, [HOST]);
    const stored = Object.fromEntries(rows.map((r) => [r.card_id, r.quantity]));
    expect(stored).toEqual(Object.fromEntries(starterGrantCards().map((e) => [e.cardId, e.count])));
  });

  it("never lowers an existing quantity (upsert keeps the max)", async () => {
    await db.query(`insert into public.cards_inventory (user_id, card_id, quantity) values ($1, 'necromancer', 5), ($1, 'ignis', 1)`, [HOST]);
    await store.ensureStarterGrant(HOST);
    const { rows } = await db.query<{ card_id: string; quantity: number }>(
      `select card_id, quantity from public.cards_inventory where user_id = $1 and card_id in ('necromancer', 'ignis') order by card_id`,
      [HOST],
    );
    expect(rows).toEqual([
      { card_id: "ignis", quantity: 1 },
      { card_id: "necromancer", quantity: 5 },
    ]);
  });

  it("a zero balance grant writes no ledger row (amount <> 0)", async () => {
    const zero = new PgCollectionStore(db, 0);
    expect(await zero.ensureStarterGrant(GUEST)).toBe(true);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cards_currency_transactions where user_id = $1`, [GUEST]);
    expect(rows[0].n).toBe(0);
  });
});

describe("getInventory", () => {
  it("ignores rows for card ids that are not in the catalog; basics are 2 without rows", async () => {
    await db.query(`insert into public.cards_inventory (user_id, card_id, quantity) values ($1, 'retired-card', 2), ($1, 'squire', 1), ($1, 'ignis', 1)`, [HOST]);
    const inv = await store.getInventory(HOST);
    expect("retired-card" in inv).toBe(false);
    expect(inv.squire).toBe(2);
    expect(inv["stone-golem"]).toBe(2);
    expect(inv.ignis).toBe(1);
  });
});

describe("constraints", () => {
  it("balance can never go negative", async () => {
    await store.ensureStarterGrant(HOST);
    await expect(db.query(`update public.cards_wallets set balance = -1 where user_id = $1`, [HOST])).rejects.toThrow(/check/i);
  });

  it("ledger idempotency key is unique per user", async () => {
    await store.ensureStarterGrant(HOST);
    await expect(
      db.query(
        `insert into public.cards_currency_transactions (user_id, amount, balance_after, kind, idempotency_key) values ($1, 10, 310, 'admin_adjustment', 'starter')`,
        [HOST],
      ),
    ).rejects.toThrow(/duplicate|unique/i);
  });

  it("deleting the profile cascades", async () => {
    await createTestUser(db, "33333333-3333-4333-8333-333333333333", "Ceci");
    const C = "33333333-3333-4333-8333-333333333333";
    await store.ensureStarterGrant(C);
    await db.query(`delete from public.profiles where id = $1`, [C]);
    for (const table of TABLES) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table} where user_id = $1`, [C]);
      expect(rows[0].n).toBe(0);
    }
  });
});

describe("privileges (§12.3)", () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of TABLES) {
      it(`${role} has no privilege on ${table}`, async () => {
        const { rows } = await db.query<Record<string, boolean>>(
          `select has_table_privilege($1, $2, 'select') as s, has_table_privilege($1, $2, 'insert') as i,
                  has_table_privilege($1, $2, 'update') as u, has_table_privilege($1, $2, 'delete') as d`,
          [role, table],
        );
        expect(rows[0]).toEqual({ s: false, i: false, u: false, d: false });
      });
    }

    it(`${role} cannot execute cards_grant_starter`, async () => {
      const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, 'public.cards_grant_starter(uuid,jsonb,integer)', 'execute') as ok`, [role]);
      expect(rows[0].ok).toBe(false);
    });

    it(`${role} has no privilege on the ledger id sequence`, async () => {
      const { rows } = await db.query<{ ok: boolean }>(
        `select has_sequence_privilege($1, pg_get_serial_sequence('public.cards_currency_transactions', 'id'), 'usage') as ok`,
        [role],
      );
      expect(rows[0].ok).toBe(false);
    });
  }

  it("a client role calling the function is denied", async () => {
    await db.exec(`set role anon`);
    try {
      await expect(db.query(`select public.cards_grant_starter($1::uuid, '[]'::jsonb, 999999)`, [HOST])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
  });

  it("RLS is enabled on every table", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname in ('cards_wallets', 'cards_currency_transactions', 'cards_inventory') and relkind = 'r' order by relname`,
    );
    expect(rows).toEqual([
      { relname: "cards_currency_transactions", relrowsecurity: true },
      { relname: "cards_inventory", relrowsecurity: true },
      { relname: "cards_wallets", relrowsecurity: true },
    ]);
  });

  it("the function is not security definer and pins search_path", async () => {
    const { rows } = await db.query<{ prosecdef: boolean; proconfig: string[] | null }>(
      `select prosecdef, proconfig from pg_proc where proname = 'cards_grant_starter'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(false);
    expect(rows[0].proconfig).toContain('search_path=""');
  });
});
