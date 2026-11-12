import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import { STARTER_DECKS } from "../catalog/starterDecks";
import type { CardDef } from "../catalog/types";
import { DECK_FORMATS } from "../config/deckRules";
import { countCards, expandDeck, validateDeck, type DeckEntry } from "./validate";

const STD = DECK_FORMATS.standard;
const undead = STARTER_DECKS["starter-undead"].entries;

/** The undead starter with `squire` ×2 replaced by `replacement` (keeps 30 cards when counts match). */
function swapSquire(replacement: DeckEntry[]): DeckEntry[] {
  return [...undead.filter((e) => e.cardId !== "squire"), ...replacement];
}

describe("validateDeck", () => {
  it("accepts both starter decks in play mode without ownership", () => {
    expect(validateDeck(STARTER_DECKS["starter-undead"].entries, STD, null, "play")).toEqual([]);
    expect(validateDeck(STARTER_DECKS["starter-beast"].entries, STD, null, "play")).toEqual([]);
  });

  it("flags 3 copies of a common/basic card", () => {
    const problems = validateDeck(swapSquire([{ cardId: "squire", count: 3 }]), STD, null, "save");
    expect(problems).toContainEqual({ code: "too_many_copies", cardId: "squire", max: 2 });
  });

  it("merges duplicate entries before counting", () => {
    const deck = swapSquire([{ cardId: "squire", count: 2 }, { cardId: "squire", count: 1 }]);
    expect(validateDeck(deck, STD, null, "save")).toContainEqual({ code: "too_many_copies", cardId: "squire", max: 2 });
    expect(validateDeck(swapSquire([{ cardId: "squire", count: 1 }, { cardId: "squire", count: 1 }]), STD, null, "play")).toEqual([]);
  });

  it("flags 2 copies of a legendary", () => {
    const deck = [...undead.filter((e) => e.cardId !== "morvath"), { cardId: "morvath", count: 2 }];
    expect(validateDeck(deck, STD, null, "save")).toContainEqual({ code: "too_many_copies", cardId: "morvath", max: 1 });
  });

  it("flags two different Única cards", () => {
    const fake: CardDef = { ...CATALOG.ignis, id: "test-unique-2", art: "test-unique-2" };
    const catalog = { ...CATALOG, [fake.id]: fake };
    const deck = [{ cardId: "ignis", count: 1 }, { cardId: "test-unique-2", count: 1 }];
    expect(validateDeck(deck, STD, null, "save", catalog)).toEqual([{ code: "too_many_uniques", max: 1 }]);
    expect(validateDeck([{ cardId: "ignis", count: 1 }], STD, null, "save", catalog)).toEqual([]);
  });

  it("requires exactly 30 cards only in play mode", () => {
    const deck29 = swapSquire([{ cardId: "squire", count: 1 }]);
    expect(countCards(deck29)).toBe(29);
    expect(validateDeck(deck29, STD, null, "play")).toEqual([{ code: "wrong_size", required: 30, actual: 29 }]);
    expect(validateDeck(deck29, STD, null, "save")).toEqual([]);
    expect(validateDeck([], STD, null, "save")).toEqual([]);
  });

  it("flags more than 30 cards in any mode", () => {
    const deck31 = [...undead, { cardId: "forest-boar", count: 1 }];
    expect(validateDeck(deck31, STD, null, "save")).toEqual([{ code: "too_many_cards", max: 30 }]);
    expect(validateDeck(deck31, STD, null, "play")).toEqual([
      { code: "too_many_cards", max: 30 },
      { code: "wrong_size", required: 30, actual: 31 },
    ]);
  });

  it("checks ownership when an inventory is given", () => {
    const problems = validateDeck([{ cardId: "necromancer", count: 2 }], STD, { necromancer: 1 }, "save");
    expect(problems).toEqual([{ code: "not_owned", cardId: "necromancer", owned: 1, needed: 2 }]);
    expect(validateDeck([{ cardId: "necromancer", count: 2 }], STD, { necromancer: 3 }, "save")).toEqual([]);
    expect(validateDeck([{ cardId: "squire", count: 1 }], STD, {}, "save")).toEqual([
      { code: "not_owned", cardId: "squire", owned: 0, needed: 1 },
    ]);
  });

  it("rejects tokens, unknown ids and malformed entries", () => {
    expect(validateDeck([{ cardId: "skeleton", count: 1 }], STD, null, "save")).toEqual([{ code: "not_collectible", cardId: "skeleton" }]);
    expect(validateDeck([{ cardId: "nope", count: 1 }], STD, null, "save")).toEqual([{ code: "unknown_card", cardId: "nope" }]);
    expect(validateDeck([{ cardId: "toString", count: 1 }], STD, null, "save")).toEqual([{ code: "unknown_card", cardId: "toString" }]);
    for (const count of [0, -1, 1.5, 31, Number.NaN]) {
      expect(validateDeck([{ cardId: "squire", count }], STD, null, "save"), String(count)).toEqual([
        { code: "invalid_entry", cardId: "squire" },
      ]);
    }
    expect(validateDeck([{ cardId: "squire", count: "2" as unknown as number }], STD, null, "save")).toEqual([
      { code: "invalid_entry", cardId: "squire" },
    ]);
  });
});

describe("expandDeck / countCards", () => {
  it("expands merged entries into one id per copy", () => {
    const entries = [{ cardId: "squire", count: 2 }, { cardId: "ignis", count: 1 }, { cardId: "squire", count: 1 }, { cardId: "x", count: 0 }];
    expect(expandDeck(entries)).toEqual(["squire", "squire", "squire", "ignis"]);
    expect(countCards(entries)).toBe(4);
    expect(expandDeck(STARTER_DECKS["starter-beast"].entries)).toHaveLength(30);
  });
});
