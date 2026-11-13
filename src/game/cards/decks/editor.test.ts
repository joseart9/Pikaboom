// Phase 15: deck-editor model — add/remove one copy, why a card cannot be added, rows, mana curve.
import { describe, expect, it } from "vitest";
import { STARTER_DECKS } from "../catalog/starterDecks";
import { starterGrantCards } from "../collection/starterGrant";
import { normalizeInventory } from "../collection/inventory";
import { addCard, addProblem, countOf, deckRows, manaCurve, removeCard, sameEntries } from "./editor";

const owned = normalizeInventory(starterGrantCards().map((e) => ({ cardId: e.cardId, quantity: e.count })));
const withIgnis = { ...owned, ignis: 1, "skeleton-king": 1 };

describe("deck editor model", () => {
  it("add / remove one copy keeps entries normalized", () => {
    let deck = addCard([], "squire");
    deck = addCard(deck, "arcane-spark");
    deck = addCard(deck, "squire");
    expect(deck).toEqual([
      { cardId: "arcane-spark", count: 1 },
      { cardId: "squire", count: 2 },
    ]);
    expect(countOf(deck, "squire")).toBe(2);
    deck = removeCard(deck, "arcane-spark");
    expect(deck).toEqual([{ cardId: "squire", count: 2 }]);
    expect(removeCard(deck, "wolf-pup")).toEqual(deck);
  });

  it("a 3rd copy is blocked (too_many_copies)", () => {
    expect(addProblem([{ cardId: "squire", count: 1 }], "squire", owned)).toBeNull();
    expect(addProblem([{ cardId: "squire", count: 2 }], "squire", owned)).toEqual({ code: "too_many_copies", cardId: "squire", max: 2 });
  });

  it("legendaries: 1 copy; Única: 1 card per deck", () => {
    expect(addProblem([{ cardId: "morvath", count: 1 }], "morvath", owned)).toMatchObject({ code: "too_many_copies", max: 1 });
    expect(addProblem([], "ignis", withIgnis)).toBeNull();
    // Ignis is the only Única in the MVP catalog, so a second Única cannot be tested with real cards; the copy
    // limit (1) is what blocks a second Ignis.
    expect(addProblem([{ cardId: "ignis", count: 1 }], "ignis", withIgnis)).toMatchObject({ code: "too_many_copies", max: 1 });
  });

  it("unowned cards and copies beyond the owned quantity are blocked (not_owned)", () => {
    expect(addProblem([], "ignis", owned)).toEqual({ code: "not_owned", cardId: "ignis", owned: 0, needed: 1 });
    expect(addProblem([{ cardId: "necromancer", count: 2 }], "necromancer", { ...owned, necromancer: 2 })).toMatchObject({ code: "too_many_copies" });
    expect(addProblem([{ cardId: "skeleton-king", count: 1 }], "squire", withIgnis)).toBeNull();
    expect(addProblem([], "skeleton-king", owned)).toMatchObject({ code: "not_owned", needed: 1 });
  });

  it("the 31st card is blocked; an already-broken deck can still be edited", () => {
    const full = [...STARTER_DECKS["starter-undead"].entries];
    expect(addProblem(full, "wolf-pup", owned)).toEqual({ code: "too_many_cards", max: 30 });
    // A deck holding a card the player no longer owns can still receive other cards.
    const broken = [{ cardId: "ignis", count: 1 }];
    expect(addProblem(broken, "squire", owned)).toBeNull();
  });

  it("rows sort by cost then name; mana curve buckets 0…7+", () => {
    const entries = STARTER_DECKS["starter-undead"].entries;
    const rows = deckRows(entries);
    expect(rows[0].def.cost).toBeLessThanOrEqual(rows[rows.length - 1].def.cost);
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(30);
    const curve = manaCurve(entries);
    expect(curve).toHaveLength(8);
    expect(curve.reduce((a, b) => a + b, 0)).toBe(30);
    expect(curve[7]).toBe(1); // Morvath (cost 8) lands in 7+
    expect(deckRows([{ cardId: "retired-card", count: 2 }])).toEqual([]);
  });

  it("sameEntries ignores order and duplicates", () => {
    expect(sameEntries([{ cardId: "a", count: 1 }, { cardId: "b", count: 2 }], [{ cardId: "b", count: 1 }, { cardId: "a", count: 1 }, { cardId: "b", count: 1 }])).toBe(true);
    expect(sameEntries([{ cardId: "a", count: 1 }], [{ cardId: "a", count: 2 }])).toBe(false);
  });
});
