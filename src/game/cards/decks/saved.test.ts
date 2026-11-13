// Phase 15: request parsing, name/entry normalization, Spanish messages for every DeckProblem code, starter payload
// and deck covers.
import { describe, expect, it } from "vitest";
import { STARTER_DECKS } from "../catalog/starterDecks";
import { isRequestError } from "../server/commands";
import { deckCover, deckProblemText, normalizeDeckName, normalizeEntries, parseDeckInput, starterDeckPayload } from "./saved";
import type { DeckProblem, DeckProblemCode } from "./validate";

describe("parseDeckInput", () => {
  it("accepts exactly { name, entries: { cardId, count }[] } and returns a fresh object", () => {
    const body = { name: "Mazo", entries: [{ cardId: "squire", count: 2 }] };
    const parsed = parseDeckInput(body);
    expect(parsed).toEqual(body);
    expect(parsed.entries).not.toBe(body.entries);
  });

  it.each([
    null,
    [],
    "x",
    { name: "A" },
    { entries: [] },
    { name: "A", entries: [], userId: "x" },
    { name: 3, entries: [] },
    { name: "x".repeat(201), entries: [] },
    { name: "A", entries: {} },
    { name: "A", entries: Array.from({ length: 121 }, () => ({ cardId: "squire", count: 1 })) },
    { name: "A", entries: [null] },
    { name: "A", entries: [{ cardId: "squire" }] },
    { name: "A", entries: [{ cardId: "squire", count: "2" }] },
    { name: "A", entries: [{ cardId: "squire", count: 2, extra: 1 }] },
    { name: "A", entries: [{ cardId: "", count: 1 }] },
    { name: "A", entries: [{ cardId: "x".repeat(65), count: 1 }] },
    { name: "A", entries: [{ cardId: "squire", count: Number.NaN }] },
  ])("rejects %j with a RequestError (400)", (body) => {
    expect(() => parseDeckInput(body)).toThrow();
    try {
      parseDeckInput(body);
    } catch (e) {
      expect(isRequestError(e)).toBe(true);
    }
  });
});

describe("normalizeDeckName / normalizeEntries", () => {
  it("trims, collapses inner whitespace and enforces 1–30 characters", () => {
    expect(normalizeDeckName("  Furia   Salvaje\t ")).toBe("Furia Salvaje");
    expect(normalizeDeckName("x".repeat(30))).toBe("x".repeat(30));
    expect(normalizeDeckName("x".repeat(31))).toBeNull();
    expect(normalizeDeckName("   ")).toBeNull();
    expect(normalizeDeckName("")).toBeNull();
  });

  it("merges duplicates, drops invalid counts, sorts by card id", () => {
    expect(
      normalizeEntries([
        { cardId: "squire", count: 1 },
        { cardId: "arcane-spark", count: 2 },
        { cardId: "squire", count: 1 },
        { cardId: "wolf-pup", count: 0 },
        { cardId: "bone-wall", count: 1.5 },
      ]),
    ).toEqual([
      { cardId: "arcane-spark", count: 2 },
      { cardId: "squire", count: 2 },
    ]);
  });
});

describe("deckProblemText (es.deckErrors)", () => {
  const samples: Record<DeckProblemCode, DeckProblem> = {
    invalid_entry: { code: "invalid_entry", cardId: "squire" },
    unknown_card: { code: "unknown_card", cardId: "retired-card" },
    not_collectible: { code: "not_collectible", cardId: "skeleton" },
    too_many_copies: { code: "too_many_copies", cardId: "necromancer", max: 2 },
    too_many_uniques: { code: "too_many_uniques", max: 1 },
    not_owned: { code: "not_owned", cardId: "ignis", owned: 0, needed: 1 },
    too_many_cards: { code: "too_many_cards", max: 30 },
    wrong_size: { code: "wrong_size", required: 30, actual: 22 },
  };

  it("has a complete Spanish message for every code (no placeholders left)", () => {
    for (const p of Object.values(samples)) {
      const text = deckProblemText(p);
      expect(text, p.code).not.toMatch(/[{}]|deckErrors\./);
      expect(text.length, p.code).toBeGreaterThan(5);
    }
  });

  it("uses the Spanish card name (or the raw id for an unknown card) and the numbers", () => {
    expect(deckProblemText(samples.too_many_copies)).toBe("Máximo 2 copias de «Nigromante».");
    expect(deckProblemText(samples.not_owned)).toBe("No tienes suficientes copias de «Ignis, el Dragón Eterno».");
    expect(deckProblemText(samples.unknown_card)).toBe("Carta desconocida: «retired-card».");
    expect(deckProblemText(samples.not_collectible)).toBe("«Esqueleto» no se puede incluir en un mazo.");
    expect(deckProblemText(samples.too_many_uniques)).toBe("Solo puedes llevar 1 carta Única.");
    expect(deckProblemText(samples.too_many_cards)).toBe("El mazo no puede tener más de 30 cartas.");
    expect(deckProblemText(samples.wrong_size)).toBe("El mazo necesita exactamente 30 cartas (tiene 22).");
  });
});

describe("starterDeckPayload / deckCover", () => {
  it("both starter decks with their Spanish names, normalized entries and 30 cards", () => {
    const payload = starterDeckPayload();
    expect(payload.map((d) => d.name)).toEqual(["Legión de Huesos", "Furia Salvaje"]);
    expect(payload[0].entries).toEqual(normalizeEntries(STARTER_DECKS["starter-undead"].entries));
    expect(payload.map((d) => d.cardCount)).toEqual([30, 30]);
  });

  it("cover = first legendary's art, else the main tribe", () => {
    expect(deckCover(STARTER_DECKS["starter-undead"].entries)).toEqual({ art: "morvath", tribe: "undead" });
    expect(deckCover([{ cardId: "wolf-pup", count: 2 }, { cardId: "squire", count: 1 }])).toEqual({ art: "deck-beast", tribe: "beast" });
    expect(deckCover([])).toEqual({ art: "deck-none", tribe: undefined });
  });
});
