// Phase 17: ShopStore contract on the dev memory store, ShopService (validation, starter grant, server-side roll,
// store response) and PgShopStore's error mapping (insufficient_funds → 409, 23505 → replay) with a fake Queryable.
import { describe, expect, it } from "vitest";
import { ECONOMY } from "../config/economy";
import { RECENT_OPENINGS_LIMIT } from "../collection/shop";
import { rngInt, seedToRng, type RngHolder } from "../engine/rng";
import { defineShopStoreTests, key } from "../testing/shopSuite";
import { GUEST, HOST } from "../testing/server";
import { MemoryCollectionStore } from "./collection";
import { isServiceError } from "./errors";
import { rollPack } from "./packs";
import type { Queryable } from "./pgStore";
import { MemoryShopStore, parsePurchaseInput, PgShopStore, ShopService } from "./shop";

function fixture() {
  const collection = new MemoryCollectionStore();
  return { collection, shop: new MemoryShopStore(collection) };
}

function seeded(seed = "abcdef0123456789abcdef0123456789") {
  const h: RngHolder = { rng: seedToRng(seed) };
  return (n: number) => rngInt(h, n);
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return isServiceError(e) ? `${e.status} ${e.code}` : `other: ${String(e)}`;
  }
  return "resolved";
}

describe("MemoryShopStore (shared contract)", () => {
  defineShopStoreTests(fixture, [HOST, GUEST]);
});

describe("parsePurchaseInput", () => {
  it("accepts a known pack type and a 32-hex key", () => {
    expect(parsePurchaseInput({ packType: "arcane", idempotencyKey: key(1) })).toEqual({ packType: "arcane", idempotencyKey: key(1) });
  });

  it.each([
    [null, "400 bad_request"],
    [[], "400 bad_request"],
    ["arcane", "400 bad_request"],
    [{ packType: "arcane" }, "400 bad_request"],
    [{ packType: "arcane", idempotencyKey: "ABCDEF0123456789ABCDEF0123456789" }, "400 bad_request"],
    [{ packType: "arcane", idempotencyKey: key(1) + "0" }, "400 bad_request"],
    [{ packType: "x", idempotencyKey: key(1) }, "400 invalid_pack"],
    [{ packType: "toString", idempotencyKey: key(1) }, "400 invalid_pack"],
    [{ packType: "__proto__", idempotencyKey: key(1) }, "400 invalid_pack"],
    [{ idempotencyKey: key(1) }, "400 invalid_pack"],
  ])("%j → %s", async (body, expected) => {
    expect(await code(Promise.resolve().then(() => parsePurchaseInput(body)))).toBe(expected);
  });
});

describe("ShopService", () => {
  it("getStore: first call grants the starter balance; offers come from ECONOMY.packs; no openings yet", async () => {
    const { collection, shop } = fixture();
    const svc = new ShopService({ store: shop, collection });
    const r = await svc.getStore(HOST);
    expect(r.balance).toBe(ECONOMY.startingBalance);
    expect(r.openings).toEqual([]);
    expect(r.packs).toHaveLength(Object.keys(ECONOMY.packs).length);
    expect(r.packs[0]).toMatchObject({ type: "arcane", price: ECONOMY.packs.arcane.price, size: ECONOMY.packs.arcane.size });
    expect(r.packs[0].odds.guaranteed.common).toBeUndefined();
  });

  it("purchasePack: grants the starter balance first, rolls server-side with the injected rand, debits the config price", async () => {
    const { collection, shop } = fixture();
    const svc = new ShopService({ store: shop, collection, rand: seeded() });
    const r = await svc.purchasePack(HOST, "arcane", key(1));
    expect(r.cards).toEqual(rollPack("arcane", seeded()));
    expect(r.balance).toBe(ECONOMY.startingBalance - ECONOMY.packs.arcane.price);
    expect(r.replayed).toBe(false);
  });

  it("purchasePack validates before touching anything", async () => {
    const { collection, shop } = fixture();
    const svc = new ShopService({ store: shop, collection });
    expect(await code(svc.purchasePack(HOST, "x", key(1)))).toBe("400 invalid_pack");
    expect(await code(svc.purchasePack(HOST, "arcane", "short"))).toBe("400 bad_request");
    expect(await collection.getWallet(HOST)).toEqual({ balance: 0 }); // no starter grant either
  });

  it("the store lists the newest 10 openings, newest first", async () => {
    const collection = new MemoryCollectionStore(2300);
    const svc = new ShopService({ store: new MemoryShopStore(collection), collection });
    const ids: string[] = [];
    for (let i = 1; i <= 12; i++) ids.push((await svc.purchasePack(HOST, "arcane", key(i))).openingId);
    const r = await svc.getStore(HOST);
    expect(r.openings.map((o) => o.id)).toEqual(ids.slice(-RECENT_OPENINGS_LIMIT).reverse());
    expect(r.balance).toBe(2300 - 12 * ECONOMY.packs.arcane.price);
  });
});

/** A Queryable that answers each call from a script (and records the SQL). */
function scripted(steps: ((sql: string, params: unknown[]) => unknown)[]): Queryable & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push(sql);
      const step = steps.shift();
      if (!step) throw new Error("unexpected query");
      return { rows: step(sql, params) as Record<string, unknown>[] };
    },
  } as unknown as Queryable & { calls: string[] };
}

describe("PgShopStore error mapping", () => {
  it("passes the cards as a text[] and parses the jsonb result", async () => {
    let seen: unknown[] = [];
    const db = scripted([
      (_sql, params) => {
        seen = params;
        return [{ result: { openingId: "o1", cards: ["ignis"], balance: 200, replayed: false } }];
      },
    ]);
    const r = await new PgShopStore(db).purchasePack(HOST, "arcane", 100, ["ignis"], key(1));
    expect(r).toEqual({ openingId: "o1", cards: ["ignis"], balance: 200, replayed: false });
    expect(seen).toEqual([HOST, "arcane", 100, ["ignis"], key(1)]);
  });

  it("raise insufficient_funds → ServiceError 409", async () => {
    const db = scripted([
      () => {
        throw Object.assign(new Error("insufficient_funds"), { code: "P0001" });
      },
    ]);
    expect(await code(new PgShopStore(db).purchasePack(HOST, "arcane", 100, ["ignis"], key(1)))).toBe("409 insufficient_funds");
  });

  it("23505 (a concurrent call with the same key won) → re-reads the opening by key and answers replayed", async () => {
    const db = scripted([
      () => {
        throw Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
      },
      () => [{ id: "o9", cards: ["necromancer", "ignis"], balance: 100 }],
    ]);
    const r = await new PgShopStore(db).purchasePack(HOST, "arcane", 100, ["scholar"], key(5));
    expect(r).toEqual({ openingId: "o9", cards: ["necromancer", "ignis"], balance: 100, replayed: true });
    expect(db.calls[1]).toMatch(/idempotency_key/);
  });

  it("23505 without a stored opening, or any other error → rethrown as is", async () => {
    const boom = Object.assign(new Error("dup"), { code: "23505" });
    const db = scripted([
      () => {
        throw boom;
      },
      () => [],
    ]);
    await expect(new PgShopStore(db).purchasePack(HOST, "arcane", 100, ["ignis"], key(1))).rejects.toBe(boom);
    const other = new Error("connection reset");
    const db2 = scripted([
      () => {
        throw other;
      },
    ]);
    await expect(new PgShopStore(db2).purchasePack(HOST, "arcane", 100, ["ignis"], key(1))).rejects.toBe(other);
  });
});
