// Phase 17: ShopStore contract tests, run against the dev memory store (unit) and Postgres (PGlite, test:db).
import { expect, it } from "vitest";
import type { CardId } from "../catalog/types";
import { ECONOMY } from "../config/economy";
import { ownedCount } from "../collection/inventory";
import type { CollectionStore } from "../server/collection";
import { isServiceError } from "../server/errors";
import type { ShopStore } from "../server/shop";

export interface ShopFixture {
  shop: ShopStore;
  collection: CollectionStore;
}

const PRICE = ECONOMY.packs.arcane.price;
/** Duplicates on purpose: inventory must count both copies. */
const CARDS: CardId[] = ["ignis", "ignis", "necromancer", "scholar", "crypt-banshee"];
const OTHER: CardId[] = ["morvath", "morvath", "morvath", "morvath", "morvath"];

export const key = (n: number) => n.toString(16).padStart(32, "0");

async function rejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected a rejection");
}

/** `make()` returns stores with no grants or openings yet for `users` (truncate / new instance per test). */
export function defineShopStoreTests(make: () => Promise<ShopFixture> | ShopFixture, users: readonly [string, string]): void {
  const [A, B] = users;

  it("no wallet yet → 409 insufficient_funds, nothing written", async () => {
    const { shop, collection } = await make();
    const e = await rejection(shop.purchasePack(A, "arcane", PRICE, CARDS, key(1)));
    expect(isServiceError(e) && e.status === 409 && e.code === "insufficient_funds").toBe(true);
    expect(await shop.listOpenings(A, 10)).toEqual([]);
    expect(await collection.getWallet(A)).toEqual({ balance: 0 });
  });

  it("success → balance −price, one opening, one pack_purchase ledger row, inventory +1 per card (duplicates counted)", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    const before = await collection.getInventory(A);
    const r = await shop.purchasePack(A, "arcane", PRICE, CARDS, key(1));
    expect(r).toMatchObject({ cards: CARDS, balance: 300 - PRICE, replayed: false });
    expect(r.openingId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await collection.getWallet(A)).toEqual({ balance: 300 - PRICE });
    const after = await collection.getInventory(A);
    expect(ownedCount(after, "ignis")).toBe(ownedCount(before, "ignis") + 2);
    expect(ownedCount(after, "necromancer")).toBe(ownedCount(before, "necromancer") + 1);
    expect(ownedCount(after, "scholar")).toBe(ownedCount(before, "scholar") + 1);
    const [tx] = await collection.getTransactions(A, 1);
    expect(tx).toMatchObject({ amount: -PRICE, balanceAfter: 300 - PRICE, kind: "pack_purchase" });
    const openings = await shop.listOpenings(A, 10);
    expect(openings).toHaveLength(1);
    expect(openings[0]).toMatchObject({ id: r.openingId, packType: "arcane", cards: CARDS });
    expect(Number.isNaN(Date.parse(openings[0].createdAt))).toBe(false);
  });

  it("same key twice → replayed with the first cards, debited once (even if the retry rolled other cards)", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    const morvath = ownedCount(await collection.getInventory(A), "morvath");
    const first = await shop.purchasePack(A, "arcane", PRICE, CARDS, key(7));
    const again = await shop.purchasePack(A, "arcane", PRICE, OTHER, key(7));
    expect(again).toEqual({ ...first, replayed: true });
    expect(await collection.getWallet(A)).toEqual({ balance: 300 - PRICE });
    expect(await shop.listOpenings(A, 10)).toHaveLength(1);
    expect(ownedCount(await collection.getInventory(A), "morvath")).toBe(morvath);
    expect((await collection.getTransactions(A, 20)).filter((t) => t.kind === "pack_purchase")).toHaveLength(1);
  });

  it("same key concurrently → one purchase, both answers carry the same opening", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    const results = await Promise.all([0, 1, 2].map(() => shop.purchasePack(A, "arcane", PRICE, CARDS, key(9))));
    expect(new Set(results.map((r) => r.openingId)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await collection.getWallet(A)).toEqual({ balance: 300 - PRICE });
  });

  it("balance exactly the price → allowed, ends at 0; the next purchase → insufficient_funds", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    for (let i = 1; i <= 300 / PRICE; i++) await shop.purchasePack(A, "arcane", PRICE, CARDS, key(i));
    expect(await collection.getWallet(A)).toEqual({ balance: 0 });
    const e = await rejection(shop.purchasePack(A, "arcane", PRICE, CARDS, key(99)));
    expect(isServiceError(e) && e.code === "insufficient_funds").toBe(true);
    expect(await shop.listOpenings(A, 10)).toHaveLength(300 / PRICE);
    // A key that already bought still replays at 0 balance.
    expect(await shop.purchasePack(A, "arcane", PRICE, CARDS, key(1))).toMatchObject({ balance: 0, replayed: true });
  });

  it("two different keys concurrently with Oro for one pack → exactly one succeeds", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    await shop.purchasePack(A, "arcane", PRICE, CARDS, key(1));
    await shop.purchasePack(A, "arcane", PRICE, CARDS, key(2));
    const settled = await Promise.allSettled([shop.purchasePack(A, "arcane", PRICE, CARDS, key(3)), shop.purchasePack(A, "arcane", PRICE, CARDS, key(4))]);
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    const failed = settled.find((s) => s.status === "rejected") as PromiseRejectedResult;
    expect(isServiceError(failed.reason) && failed.reason.code === "insufficient_funds").toBe(true);
    expect(await collection.getWallet(A)).toEqual({ balance: 0 });
    expect(await shop.listOpenings(A, 10)).toHaveLength(3);
  });

  it("listOpenings: newest first, limit applies, per user; keys are per user", async () => {
    const { shop, collection } = await make();
    await collection.ensureStarterGrant(A);
    await collection.ensureStarterGrant(B);
    const r1 = await shop.purchasePack(A, "arcane", PRICE, CARDS, key(1));
    const r2 = await shop.purchasePack(A, "arcane", PRICE, OTHER, key(2));
    const rb = await shop.purchasePack(B, "arcane", PRICE, CARDS, key(1)); // same key, other user: a new purchase
    expect(rb.replayed).toBe(false);
    expect((await shop.listOpenings(A, 10)).map((o) => o.id)).toEqual([r2.openingId, r1.openingId]);
    expect((await shop.listOpenings(A, 1)).map((o) => o.id)).toEqual([r2.openingId]);
    expect(await shop.listOpenings(A, 0)).toEqual([]);
    expect((await shop.listOpenings(B, 10)).map((o) => o.id)).toEqual([rb.openingId]);
    expect(await collection.getWallet(B)).toEqual({ balance: 300 - PRICE });
  });
}
