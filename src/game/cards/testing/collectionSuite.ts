// Phase 14: CollectionStore contract tests, run against the memory store (unit) and Postgres (PGlite, test:db).
import { expect, it } from "vitest";
import { BASIC_CARDS, COLLECTIBLE_CARDS } from "../catalog";
import { ECONOMY } from "../config/economy";
import { ownedCount } from "../collection/inventory";
import { starterGrantCards } from "../collection/starterGrant";
import type { CollectionStore } from "../server/collection";

/** `make()` returns a store with no grants yet for `users` (truncate / new instance per test). */
export function defineCollectionStoreTests(make: () => Promise<CollectionStore> | CollectionStore, users: readonly [string, string]): void {
  const [A, B] = users;

  it("before the grant: balance 0, only basics owned", async () => {
    const store = await make();
    expect(await store.getWallet(A)).toEqual({ balance: 0 });
    const inv = await store.getInventory(A);
    expect(Object.keys(inv).sort()).toEqual(BASIC_CARDS.map((d) => d.id).sort());
  });

  it("grant twice → true then false, balance stays at the starting balance", async () => {
    const store = await make();
    expect(await store.ensureStarterGrant(A)).toBe(true);
    expect(await store.ensureStarterGrant(A)).toBe(false);
    expect(await store.getWallet(A)).toEqual({ balance: ECONOMY.startingBalance });
    expect(ECONOMY.startingBalance).toBe(300);
  });

  it("concurrent grants (two tabs) → exactly one succeeds", async () => {
    const store = await make();
    const results = await Promise.all([store.ensureStarterGrant(A), store.ensureStarterGrant(A), store.ensureStarterGrant(A)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.getWallet(A)).toEqual({ balance: 300 });
  });

  it("inventory after the grant has the starter quantities (31/41 discovered)", async () => {
    const store = await make();
    await store.ensureStarterGrant(A);
    const inv = await store.getInventory(A);
    for (const { cardId, count } of starterGrantCards()) expect(ownedCount(inv, cardId)).toBe(count);
    expect(COLLECTIBLE_CARDS.filter((d) => ownedCount(inv, d.id) > 0)).toHaveLength(31);
    expect(ownedCount(inv, "ignis")).toBe(0);
  });

  it("ledger (Phase 16): empty before the grant; the starter grant is one +300 row; limit applies", async () => {
    const store = await make();
    expect(await store.getTransactions(A, 20)).toEqual([]);
    await store.ensureStarterGrant(A);
    await store.ensureStarterGrant(A);
    const rows = await store.getTransactions(A, 20);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 300, balanceAfter: 300, kind: "starter_grant" });
    expect(Number.isNaN(Date.parse(rows[0].createdAt))).toBe(false);
    expect(await store.getTransactions(A, 0)).toEqual([]);
    expect(await store.getTransactions(B, 20)).toEqual([]);
  });

  it("users are independent", async () => {
    const store = await make();
    await store.ensureStarterGrant(A);
    expect(await store.getWallet(B)).toEqual({ balance: 0 });
    expect(ownedCount(await store.getInventory(B), "necromancer")).toBe(0);
    expect(await store.ensureStarterGrant(B)).toBe(true);
    expect(ownedCount(await store.getInventory(B), "necromancer")).toBe(2);
  });
}
