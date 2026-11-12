import { describe, expect, it } from "vitest";
import { es } from "../i18n/es";
import { CATALOG } from "./index";
import type { AbilityDef, CardDef, MobCardDef, SpellCardDef } from "./types";
import { IMPLEMENTED_EFFECT_TYPES } from "../engine/effects/execute";
import { validateCatalog, type ValidateOptions } from "./validate";

const mob = (id: string, extra: Partial<MobCardDef> = {}): MobCardDef => ({
  id, version: 1, type: "mob", set: "core", cost: 1, rarity: "common", collectible: true, art: id,
  attack: 1, health: 1, tribes: [], keywords: {}, abilities: [], ...extra,
});
const spell = (id: string, abilities: AbilityDef[]): SpellCardDef => ({
  id, version: 1, type: "spell", set: "core", cost: 1, rarity: "common", collectible: true, art: id, abilities,
});

/** Validates the real catalog plus `extra` defs (each given a dictionary entry unless `noDict`). */
function check(extra: Record<string, CardDef>, noDict = false, options?: ValidateOptions): string[] {
  const dict = { ...es.cards };
  if (!noDict) for (const key of Object.keys(extra)) dict[key] = { name: key, text: "" };
  return validateCatalog({ ...CATALOG, ...extra }, dict, options);
}

/** Options as of Phase 7 (kept explicit so the structural `if` tests don't depend on the phase). */
const WITH_IF: ValidateOptions = { implementedEffects: [...new Set([...IMPLEMENTED_EFFECT_TYPES, "if" as const])] };

const cast = (effects: AbilityDef["effects"], more: Partial<AbilityDef> = {}): AbilityDef => ({
  id: "cast", trigger: { on: "play" }, effects, ...more,
});

describe("validateCatalog", () => {
  it("accepts a well-formed extra card", () => {
    expect(check({ "test-ok": mob("test-ok") })).toEqual([]);
  });

  it.each<[string, Record<string, CardDef>, RegExp]>([
    ["duplicate id", { "test-a": mob("test-a"), "test-b": mob("test-a") }, /duplicate id|does not match/],
    ["id not kebab-case", { Test_A: mob("Test_A") }, /kebab-case/],
    ["version 0", { "test-v": mob("test-v", { version: 0 }) }, /version/],
    ["cost 21", { "test-c": mob("test-c", { cost: 21 }) }, /cost/],
    ["health 0", { "test-h": mob("test-h", { health: 0 }) }, /health/],
    ["three tribes", { "test-t": mob("test-t", { tribes: ["beast", "undead", "human"] }) }, /tribes/],
    ["shield 10", { "test-s": mob("test-s", { keywords: { shield: 10 } }) }, /shield/],
    ["berserk.percent 100", { "test-b": mob("test-b", { keywords: { berserk: { percent: 100, attack: 2 } } }) }, /berserk.percent/],
    [
      "spell with two abilities",
      { "test-sp": spell("test-sp", [cast([{ type: "draw", count: 1 }]), { ...cast([{ type: "draw", count: 1 }]), id: "two" }]) },
      /exactly one ability/,
    ],
    [
      "spell not triggered on play",
      { "test-sp": spell("test-sp", [{ id: "x", trigger: { on: "death" }, effects: [{ type: "draw", count: 1 }] }]) },
      /trigger on "play"/,
    ],
    [
      "chosen without target",
      { "test-ch": spell("test-ch", [cast([{ type: "damage", amount: 1, to: { kind: "chosen" } }])]) },
      /"chosen" used in an ability without target/,
    ],
    [
      "target on a death ability",
      {
        "test-dt": mob("test-dt", {
          abilities: [{
            id: "deathrattle", trigger: { on: "death" }, target: { group: "enemyMobs" },
            effects: [{ type: "damage", amount: 1, to: { kind: "chosen" } }],
          }],
        }),
      },
      /target is only allowed on "play"/,
    ],
    [
      "two targeted abilities",
      {
        "test-tt": mob("test-tt", {
          abilities: [
            cast([{ type: "damage", amount: 1, to: { kind: "chosen" } }], { id: "a", target: { group: "allMobs" } }),
            cast([{ type: "damage", amount: 1, to: { kind: "chosen" } }], { id: "b", target: { group: "allMobs" } }),
          ],
        }),
      },
      /at most one ability may have a target/,
    ],
    [
      "eventTarget on a play trigger",
      { "test-ev": mob("test-ev", { abilities: [cast([{ type: "buff", to: { kind: "eventTarget" }, attack: 1 }])] }) },
      /"eventTarget" used with trigger "play"/,
    ],
    [
      "unknown summon card",
      { "test-us": spell("test-us", [cast([{ type: "summon", card: "nope", count: 1 }])]) },
      /unknown card "nope"/,
    ],
    [
      "summon count 9",
      { "test-c9": spell("test-c9", [cast([{ type: "summon", card: "skeleton", count: 9 }])]) },
      /count must be 1..7/,
    ],
    [
      "summoning a spell",
      { "test-ss": spell("test-ss", [cast([{ type: "summon", card: "arcane-spark", count: 1 }])]) },
      /is not a mob/,
    ],
    [
      "random count 0",
      { "test-r0": spell("test-r0", [cast([{ type: "damage", amount: 1, to: { kind: "random", group: "allMobs", count: 0 } }])]) },
      /random.count/,
    ],
    [
      "unknown filter defId",
      {
        "test-fd": mob("test-fd", {
          abilities: [{ id: "x", trigger: { on: "otherSummoned", side: "any", filter: { defId: "nope" } }, effects: [{ type: "draw", count: 1 }] }],
        }),
      },
      /unknown card "nope"/,
    ],
    [
      "if nested 4 deep",
      {
        "test-if": spell("test-if", [cast([{
          type: "if", condition: { kind: "heroHealth", side: "friendly", op: "lte", value: 10 },
          then: [{
            type: "if", condition: { kind: "heroHealth", side: "friendly", op: "lte", value: 10 },
            then: [{
              type: "if", condition: { kind: "heroHealth", side: "friendly", op: "lte", value: 10 },
              then: [{
                type: "if", condition: { kind: "heroHealth", side: "friendly", op: "lte", value: 10 },
                then: [{ type: "draw", count: 1 }],
              }],
            }],
          }],
        }])]),
      },
      /nested deeper than 3/,
    ],
    [
      "limit perTurn 0",
      { "test-l0": mob("test-l0", { abilities: [{ id: "x", trigger: { on: "turnEnd", whose: "own" }, effects: [{ type: "draw", count: 1 }], limit: { perTurn: 0 } }] }) },
      /limit.perTurn/,
    ],
    [
      "duplicate ability ids",
      {
        "test-da": mob("test-da", {
          abilities: [
            { id: "x", trigger: { on: "death" }, effects: [{ type: "draw", count: 1 }] },
            { id: "x", trigger: { on: "summoned" }, effects: [{ type: "draw", count: 1 }] },
          ],
        }),
      },
      /duplicate ability id/,
    ],
    [
      "healthThreshold percent 100",
      { "test-ht": mob("test-ht", { abilities: [{ id: "x", trigger: { on: "healthThreshold", percent: 100 }, effects: [{ type: "draw", count: 1 }] }] }) },
      /healthThreshold percent/,
    ],
  ])("rejects: %s", (_name, extra, pattern) => {
    const errors = check(extra);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join("\n")).toMatch(pattern);
  });

  it("rejects a missing dictionary entry", () => {
    const errors = check({ "test-nd": mob("test-nd") }, true);
    expect(errors).toEqual([expect.stringMatching(/missing dictionary name/), expect.stringMatching(/missing dictionary text/)]);
  });

  it("row 20 / rule 10: the real catalog is valid with rule 10 active", () => {
    expect(validateCatalog(CATALOG, es.cards)).toEqual([]);
  });

  it("rule 10: effect types without an engine handler are rejected (V1 effects); `if` is accepted from Phase 7", () => {
    const ifCard = spell("test-if1", [cast([{ type: "if", condition: { kind: "heroHealth", side: "friendly", op: "lte", value: 10 }, then: [{ type: "draw", count: 1 }] }])]);
    const silenceCard = spell("test-sil", [cast([{ type: "silence", to: { kind: "chosen" } }], { target: { group: "enemyMobs" } })]);
    expect(check({ "test-if1": ifCard })).toEqual([]);
    expect(check({ "test-sil": silenceCard }).join(" | ")).toMatch(/effect type "silence" is not implemented/);
    expect(check({ "test-if1": ifCard }, false, { implementedEffects: ["draw"] }).join(" | ")).toMatch(/effect type "if" is not implemented/);
  });

  it("rejects the hasStatus condition until statuses exist (Phase 18)", () => {
    const card = mob("test-hs", {
      abilities: [{
        id: "x", trigger: { on: "turnEnd", whose: "own" },
        conditions: [{ kind: "hasStatus", subject: "self", status: "burn" }],
        effects: [{ type: "draw", count: 1 }],
      }],
    });
    expect(check({ "test-hs": card }).join(" | ")).toMatch(/condition kind "hasStatus" is not implemented/);
    expect(check({ "test-hs": card }, false, { implementedConditions: ["hasStatus"] })).toEqual([]);
  });

  it("accepts the documented context uses (chosen with target, eventTarget on otherSummoned, if depth 3)", () => {
    expect(
      check({
        "test-ok1": mob("test-ok1", {
          abilities: [{
            id: "pack", trigger: { on: "otherSummoned", side: "friendly" },
            effects: [{ type: "buff", to: { kind: "eventTarget" }, attack: 1 }],
          }],
        }),
        "test-ok2": spell("test-ok2", [cast([
          { type: "damage", amount: 1, to: { kind: "chosen" } },
          { type: "damage", amount: 1, to: { kind: "random", group: "enemyMobs", count: 2, excludeChosen: true } },
          {
            type: "if", condition: { kind: "isEnemy", subject: "chosen" },
            then: [{ type: "if", condition: { kind: "not", condition: { kind: "isFriendly", subject: "chosen" } },
              then: [{ type: "if", condition: { kind: "heroHealth", side: "enemy", op: "lte", value: 5 }, then: [{ type: "draw", count: 1 }] }] }],
          },
        ], { target: { group: "enemyMobs" } })]),
      }, false, WITH_IF),
    ).toEqual([]);
  });
});
