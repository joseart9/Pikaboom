import { describe, expect, it } from "vitest";
import { cardName, cardText, t, type MessageKey } from "./index";
import { es } from "./es";

// Every EngineError code from §10.2 of the implementation plan.
const ENGINE_ERROR_CODES = [
  "not_your_turn",
  "wrong_phase",
  "card_not_in_hand",
  "not_enough_mana",
  "board_full",
  "invalid_position",
  "target_required",
  "invalid_target",
  "no_valid_targets",
  "unexpected_target",
  "unit_not_found",
  "cannot_attack",
  "summoning_sick",
  "rush_no_hero",
  "must_attack_taunt",
  "already_mulliganed",
  "invalid_mulligan",
  "game_over",
] as const;

describe("t()", () => {
  it("looks up dotted keys", () => {
    expect(t("rarity.legendary")).toBe("Legendaria");
    expect(t("game.title")).toBe("Duelo Arcano");
    expect(t("errors.not_enough_mana")).toBe("No tienes suficiente maná.");
  });

  it("replaces {param} placeholders and leaves unknown ones intact", () => {
    expect(t("match.turnNumber", { n: 7 })).toBe("Turno 7");
    expect(t("match.turnNumber", { other: 1 })).toBe("Turno {n}");
    expect(t("match.turnNumber")).toBe("Turno {n}");
  });

  it("returns the key for unknown keys", () => {
    expect(t("errors.does_not_exist" as MessageKey)).toBe("errors.does_not_exist");
    expect(t("nope" as MessageKey)).toBe("nope");
    expect(t("game.title.deeper" as MessageKey)).toBe("game.title.deeper");
  });

  it("returns the key when the value is an object", () => {
    expect(t("rarity" as MessageKey)).toBe("rarity");
  });
});

describe("dictionary", () => {
  it("has an errors.* entry for every EngineError code", () => {
    for (const code of ENGINE_ERROR_CODES) {
      const text: unknown = (es.errors as Record<string, unknown>)[code];
      expect(typeof text, code).toBe("string");
      expect((text as string).length, code).toBeGreaterThan(0);
    }
  });
});

describe("cardName() / cardText()", () => {
  it("fall back to the id / empty string for unknown cards", () => {
    expect(cardName("no-such-card")).toBe("no-such-card");
    expect(cardText("no-such-card")).toBe("");
    expect(cardName("toString")).toBe("toString");
  });
});
