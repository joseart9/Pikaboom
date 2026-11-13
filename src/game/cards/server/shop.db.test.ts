// Phase 17 I: `cards_purchase_pack` and `cards_pack_openings` on PGlite — the shared ShopStore contract, the exact
// rows a purchase writes, all-or-nothing failures, the service end to end, and the lockdown for client roles.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defineShopStoreTests, key } from "../testing/shopSuite";
import { applyMigrations, createTestDb, createTestUser } from "../testing/pglite";
import { GUEST, HOST } from "../testing/server";
import { PgCollectionStore } from "./collection";
import { PgShopStore, ShopService } from "./shop";

let db: PGlite;
let collection: PgCollectionStore;
let shop: PgShopStore;

const C = "33333333-3333-4333-8333-333333333333";

beforeAll(async () => {
  db = await createTestDb();
  collection = new PgCollectionStore(db);
  shop = new PgShopStore(db);
  await createTestUser(db, HOST, "Ana");
  await createTestUser(db, GUEST, "Beto");
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`truncate public.cards_wallets, public.cards_currency_transactions, public.cards_inventory, public.cards_decks, public.cards_pack_openings`);
});

async function count(table: string, user = HOST): Promise<number> {
  const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table} where user_id = $1`, [user]);
  return rows[0].n;
}

async function inventory(user = HOST): Promise<Record<string, number>> {
  const { rows } = await db.query<{ card_id: string; quantity: number }>(`select card_id, quantity from public.cards_inventory where user_id = $1`, [user]);
  return Object.fromEntries(rows.map((r) => [r.card_id, r.quantity]));
}

describe("PgShopStore (shared contract)", () => {
  defineShopStoreTests(() => ({ shop, collection }), [HOST, GUEST]);
});

describe("cards_purchase_pack", () => {
  it("insufficient funds → exception, no rows written anywhere", async () => {
    await collection.ensureStarterGrant(HOST);
    await db.query(`update public.cards_wallets set balance = 99 where user_id = $1`, [HOST]);
    const inv = await inventory();
    await expect(db.query(`select public.cards_purchase_pack($1, 'arcane', 100, array['ignis','ignis'], $2)`, [HOST, key(1)])).rejects.toThrow(/insufficient_funds/);
    expect(await count("public.cards_pack_openings")).toBe(0);
    expect(await count("public.cards_currency_transactions")).toBe(1); // the starter grant only
    expect(await inventory()).toEqual(inv);
    const { rows } = await db.query<{ balance: number }>(`select balance from public.cards_wallets where user_id = $1`, [HOST]);
    expect(rows[0].balance).toBe(99);
  });

  it("success → balance −100, the opening row, the ledger row (ref = opening id, key pack:<key>), inventory increments", async () => {
    await collection.ensureStarterGrant(HOST);
    const before = await inventory();
    const r = await shop.purchasePack(HOST, "arcane", 100, ["ignis", "ignis", "scholar", "necromancer", "crypt-banshee"], key(1));
    const opening = await db.query(`select id, pack_type, price, cards, idempotency_key from public.cards_pack_openings where user_id = $1`, [HOST]);
    expect(opening.rows).toEqual([
      { id: r.openingId, pack_type: "arcane", price: 100, cards: ["ignis", "ignis", "scholar", "necromancer", "crypt-banshee"], idempotency_key: key(1) },
    ]);
    const ledger = await db.query(
      `select amount, balance_after, kind, ref, idempotency_key from public.cards_currency_transactions where user_id = $1 and kind = 'pack_purchase'`,
      [HOST],
    );
    expect(ledger.rows).toEqual([{ amount: -100, balance_after: 200, kind: "pack_purchase", ref: r.openingId, idempotency_key: `pack:${key(1)}` }]);
    const after = await inventory();
    expect(after.ignis).toBe((before.ignis ?? 0) + 2);
    expect(after.scholar).toBe((before.scholar ?? 0) + 1);
    expect(after.necromancer).toBe((before.necromancer ?? 0) + 1);
    expect(after["crypt-banshee"]).toBe((before["crypt-banshee"] ?? 0) + 1);
  });

  it("same key twice → replayed: the stored cards, balance debited once, one opening and one ledger row", async () => {
    await collection.ensureStarterGrant(HOST);
    const call = (cards: string[]) =>
      db.query<{ r: { openingId: string; cards: string[]; balance: number; replayed: boolean } }>(`select public.cards_purchase_pack($1, 'arcane', 100, $2::text[], $3) as r`, [
        HOST,
        cards,
        key(4),
      ]);
    const first = (await call(["ignis"])).rows[0].r;
    const second = (await call(["morvath"])).rows[0].r;
    expect(first.replayed).toBe(false);
    expect(second).toEqual({ ...first, replayed: true });
    expect(await count("public.cards_pack_openings")).toBe(1);
    expect(await count("public.cards_currency_transactions")).toBe(2); // starter + one purchase
  });

  it("rejects an empty pack or a non-positive price without writing", async () => {
    await collection.ensureStarterGrant(HOST);
    await expect(db.query(`select public.cards_purchase_pack($1, 'arcane', 100, array[]::text[], $2)`, [HOST, key(1)])).rejects.toThrow(/invalid_pack/);
    await expect(db.query(`select public.cards_purchase_pack($1, 'arcane', 0, array['ignis'], $2)`, [HOST, key(2)])).rejects.toThrow(/invalid_pack/);
    expect(await count("public.cards_pack_openings")).toBe(0);
  });

  it("ShopService end to end: a new account buys 3 packs with the starter 300 Oro → 0, 15 cards, then 409", async () => {
    const svc = new ShopService({ store: shop, collection });
    const total = async () => (await db.query<{ n: number | null }>(`select sum(quantity)::int as n from public.cards_inventory where user_id = $1`, [HOST])).rows[0].n ?? 0;
    expect((await svc.getStore(HOST)).balance).toBe(300); // the store performs the starter grant
    const start = await total();
    for (let i = 1; i <= 3; i++) await svc.purchasePack(HOST, "arcane", key(i));
    const store = await svc.getStore(HOST);
    expect(store.balance).toBe(0);
    expect(store.openings).toHaveLength(3);
    expect(await total()).toBe(start + 15);
    await expect(svc.purchasePack(HOST, "arcane", key(4))).rejects.toMatchObject({ status: 409, code: "insufficient_funds" });
    // A replay of a past key still answers with its cards and the current balance.
    const replay = await svc.purchasePack(HOST, "arcane", key(2));
    expect(replay).toMatchObject({ openingId: store.openings[1].id, cards: store.openings[1].cards, balance: 0, replayed: true });
  });

  it("deleting the profile cascades to its openings", async () => {
    await createTestUser(db, C, "Ceci");
    await collection.ensureStarterGrant(C);
    await shop.purchasePack(C, "arcane", 100, ["ignis"], key(1));
    await db.query(`delete from public.profiles where id = $1`, [C]);
    expect(await count("public.cards_pack_openings", C)).toBe(0);
  });

  it("re-running every migration is idempotent and keeps the rows", async () => {
    await collection.ensureStarterGrant(HOST);
    await shop.purchasePack(HOST, "arcane", 100, ["ignis"], key(1));
    await applyMigrations(db);
    expect(await count("public.cards_pack_openings")).toBe(1);
  });
});

describe("privileges (§12.3)", () => {
  for (const role of ["anon", "authenticated"]) {
    it(`${role} has no privilege on cards_pack_openings`, async () => {
      const { rows } = await db.query<Record<string, boolean>>(
        `select has_table_privilege($1, 'public.cards_pack_openings', 'select') as s, has_table_privilege($1, 'public.cards_pack_openings', 'insert') as i,
                has_table_privilege($1, 'public.cards_pack_openings', 'update') as u, has_table_privilege($1, 'public.cards_pack_openings', 'delete') as d`,
        [role],
      );
      expect(rows[0]).toEqual({ s: false, i: false, u: false, d: false });
    });

    it(`${role} cannot execute cards_purchase_pack`, async () => {
      const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, 'public.cards_purchase_pack(uuid,text,integer,text[],text)', 'execute') as ok`, [role]);
      expect(rows[0].ok).toBe(false);
    });
  }

  it("a client role calling the function is denied (no free cards)", async () => {
    await collection.ensureStarterGrant(HOST);
    await db.exec(`set role authenticated`);
    try {
      await expect(db.query(`select public.cards_purchase_pack($1, 'arcane', 1, array['ignis','ignis','ignis'], $2)`, [HOST, key(1)])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
    expect(await count("public.cards_pack_openings")).toBe(0);
  });

  it("RLS on, function not security definer, empty search_path", async () => {
    const { rows: rls } = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'cards_pack_openings' and relkind = 'r'`);
    expect(rls).toEqual([{ relrowsecurity: true }]);
    const { rows } = await db.query<{ prosecdef: boolean; proconfig: string[] | null }>(`select prosecdef, proconfig from pg_proc where proname = 'cards_purchase_pack'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].prosecdef).toBe(false);
    expect(rows[0].proconfig).toContain('search_path=""');
  });
});
