// Phase 14 I: starter grant contents + inventory normalization.
import { describe, expect, it } from "vitest";
import { BASIC_CARDS, CATALOG, COLLECTIBLE_CARDS } from "../catalog";
import { STARTER_DECKS, STARTER_DECK_IDS } from "../catalog/starterDecks";
import { DECK_FORMATS } from "../config/deckRules";
import { validateDeck } from "../decks/validate";
import { normalizeInventory, ownedCount } from "./inventory";
import { starterGrantCards } from "./starterGrant";

const grant = starterGrantCards();
const owned = Object.fromEntries(grant.map((e) => [e.cardId, e.count]));

describe("starterGrantCards", () => {
  it("includes every basic ×2", () => {
    expect(BASIC_CARDS).toHaveLength(8);
    for (const def of BASIC_CARDS) expect(owned[def.id]).toBe(2);
  });

  it("includes morvath ×1, ursaria ×1, necromancer ×2", () => {
    expect(owned.morvath).toBe(1);
    expect(owned.ursaria).toBe(1);
    expect(owned.necromancer).toBe(2);
  });

  it("fully covers both starter decks (play-mode validation with the grant as inventory)", () => {
    for (const id of STARTER_DECK_IDS) expect(validateDeck(STARTER_DECKS[id].entries, DECK_FORMATS.standard, owned, "play")).toEqual([]);
  });

  it("grants nothing else: 8 basics + 23 starter non-basics = 31 distinct collectible cards, no duplicates", () => {
    expect(grant).toHaveLength(31);
    expect(new Set(grant.map((e) => e.cardId)).size).toBe(31);
    const inDecks = new Set(STARTER_DECK_IDS.flatMap((id) => STARTER_DECKS[id].entries.map((e) => e.cardId)));
    for (const { cardId, count } of grant) {
      expect(CATALOG[cardId].collectible).toBe(true);
      expect(CATALOG[cardId].rarity === "basic" || inDecks.has(cardId)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(DECK_FORMATS.standard.copyLimits[CATALOG[cardId].rarity]);
    }
  });

  it("uses the max count across the two decks (shield-bearer is in both, still ×2)", () => {
    expect(owned["shield-bearer"]).toBe(2);
  });

  it("is deterministic and sorted like the collection", () => {
    expect(starterGrantCards()).toEqual(grant);
    const order = COLLECTIBLE_CARDS.map((d) => d.id).filter((id) => id in owned);
    expect(grant.map((e) => e.cardId)).toEqual(order);
  });
});

describe("normalizeInventory", () => {
  it("reports basics as 2 even without rows, drops unknown/token ids and non-positive quantities", () => {
    const inv = normalizeInventory([
      { cardId: "necromancer", quantity: 2 },
      { cardId: "removed-card", quantity: 3 },
      { cardId: "skeleton", quantity: 1 }, // token: not collectible
      { cardId: "morvath", quantity: 0 },
      { cardId: "squire", quantity: 7 },
    ]);
    expect(inv.necromancer).toBe(2);
    expect("removed-card" in inv).toBe(false);
    expect("skeleton" in inv).toBe(false);
    expect("morvath" in inv).toBe(false);
    expect(inv.squire).toBe(2);
    for (const def of BASIC_CARDS) expect(ownedCount(inv, def.id)).toBe(2);
    expect(ownedCount(inv, "ignis")).toBe(0);
  });

  it("a fresh account (starter grant only) discovers 31/74", () => {
    const inv = normalizeInventory(grant.map((e) => ({ cardId: e.cardId, quantity: e.count })));
    expect(COLLECTIBLE_CARDS).toHaveLength(74);
    expect(COLLECTIBLE_CARDS.filter((d) => ownedCount(inv, d.id) > 0)).toHaveLength(31);
  });
});
