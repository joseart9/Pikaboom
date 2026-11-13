// Phase 15: DeckStore contract tests, run against the memory store (unit) and Postgres (PGlite, test:db).
import { expect, it } from "vitest";
import { STARTER_DECKS } from "../catalog/starterDecks";
import { MAX_SAVED_DECKS } from "../config/deckRules";
import { normalizeEntries } from "../decks/saved";
import { t } from "../i18n";
import { isServiceError } from "../server/errors";
import type { DeckStore, DeckWrite } from "../server/decks";

const deck = (name: string, entries = [{ cardId: "squire", count: 2 }]): DeckWrite => ({ name, entries, cardCount: entries.reduce((n, e) => n + e.count, 0) });

/** `make()` returns a store with no decks and no grants for `users` (truncate / new instance per test). */
export function defineDeckStoreTests(make: () => Promise<DeckStore> | DeckStore, users: readonly [string, string]): void {
  const [A, B] = users;

  it("create → get → list; entries and count round-trip", async () => {
    const store = await make();
    const created = await store.createDeck(A, deck("Uno", [{ cardId: "squire", count: 2 }, { cardId: "necromancer", count: 1 }]), MAX_SAVED_DECKS);
    expect(created).toMatchObject({ name: "Uno", cardCount: 3, entries: [{ cardId: "squire", count: 2 }, { cardId: "necromancer", count: 1 }] });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await store.getDeck(A, created.id)).toEqual(created);
    expect(await store.listDecks(A)).toEqual([created]);
    expect(await store.listDecks(B)).toEqual([]);
  });

  it("10 decks ok, the 11th → deck_limit", async () => {
    const store = await make();
    for (let i = 0; i < MAX_SAVED_DECKS; i++) await store.createDeck(A, deck(`Mazo ${i}`), MAX_SAVED_DECKS);
    const err = await store.createDeck(A, deck("Once"), MAX_SAVED_DECKS).catch((e: unknown) => e);
    expect(isServiceError(err) && { status: err.status, code: err.code }).toEqual({ status: 409, code: "deck_limit" });
    expect(await store.listDecks(A)).toHaveLength(MAX_SAVED_DECKS);
    // The limit is per user.
    await store.createDeck(B, deck("Otro"), MAX_SAVED_DECKS);
  });

  it("11 parallel creates from empty → exactly 10 decks", async () => {
    const store = await make();
    const results = await Promise.allSettled(Array.from({ length: 11 }, (_, i) => store.createDeck(A, deck(`P${i}`), MAX_SAVED_DECKS)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(isServiceError(rejected[0].reason) && rejected[0].reason.code).toBe("deck_limit");
    expect(await store.listDecks(A)).toHaveLength(10);
  });

  it("another user's deck: get null, update null (0 rows), delete false — and nothing changes", async () => {
    const store = await make();
    const mine = await store.createDeck(A, deck("Mío"), MAX_SAVED_DECKS);
    expect(await store.getDeck(B, mine.id)).toBeNull();
    expect(await store.updateDeck(B, mine.id, deck("Robado"))).toBeNull();
    expect(await store.deleteDeck(B, mine.id)).toBe(false);
    expect(await store.getDeck(A, mine.id)).toEqual(mine);
  });

  it("update replaces name/entries/count and bumps updatedAt; delete removes", async () => {
    const store = await make();
    const d = await store.createDeck(A, deck("Viejo"), MAX_SAVED_DECKS);
    const u = await store.updateDeck(A, d.id, deck("Nuevo", [{ cardId: "wolf-pup", count: 1 }]));
    expect(u).toMatchObject({ id: d.id, name: "Nuevo", entries: [{ cardId: "wolf-pup", count: 1 }], cardCount: 1 });
    expect(u!.updatedAt.getTime()).toBeGreaterThanOrEqual(d.updatedAt.getTime());
    expect(await store.deleteDeck(A, d.id)).toBe(true);
    expect(await store.deleteDeck(A, d.id)).toBe(false);
    expect(await store.getDeck(A, d.id)).toBeNull();
  });

  it("starter deck grant is idempotent: the two starter decks, once", async () => {
    const store = await make();
    expect(await store.grantStarterDecks(A)).toBe(true);
    expect(await store.grantStarterDecks(A)).toBe(false);
    const decks = await store.listDecks(A);
    expect(decks.map((d) => d.name).sort()).toEqual([t("starterDecks.beast"), t("starterDecks.undead")].sort());
    const undead = decks.find((d) => d.name === t("starterDecks.undead"))!;
    expect(undead.entries).toEqual(normalizeEntries(STARTER_DECKS["starter-undead"].entries));
    expect(undead.cardCount).toBe(30);
    expect(await store.listDecks(B)).toEqual([]);
  });

  it("concurrent starter deck grants → still two decks", async () => {
    const store = await make();
    const results = await Promise.all([store.grantStarterDecks(A), store.grantStarterDecks(A), store.grantStarterDecks(A)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.listDecks(A)).toHaveLength(2);
  });
}
