import { describe, expect, it } from "vitest";
import type { ConditionDef } from "../catalog/types";
import { act, makeState, unitAt } from "../testing/fixtures";
import { newCtx } from "./ctx";
import { checkCondition, checkConditions } from "./effects/conditions";
import type { AbilityContext } from "./effects/context";
import { getAttack, getHealth, getMaxHealth } from "./stats";
import type { MatchState } from "./types";

function check(s: MatchState, c: ConditionDef, extra: Partial<AbilityContext> = {}): boolean {
  return checkCondition(newCtx(s), c, { controller: 0, sourceId: "c1", sourceDefId: "test-1-1", depth: 1, ...extra });
}

describe("conditions", () => {
  it("row 15: countAtLeast friendlyMobs ≥ 3 is false with 2, true with 3", () => {
    const c: ConditionDef = { kind: "countAtLeast", selector: { kind: "all", group: "friendlyMobs" }, min: 3 };
    expect(check(makeState({ p0: { board: ["test-1-1", "test-1-1"] } }), c)).toBe(false);
    expect(check(makeState({ p0: { board: ["test-1-1", "test-1-1", "test-1-1"] } }), c)).toBe(true);
  });

  it("row 16: `if` with healthPercent self ≤ 50 takes the else branch above, the then branch at/below", () => {
    let s = makeState({ p0: { board: [{ defId: "test-1-1", attack: 1, health: 9 }], hand: ["arcane-spark", "arcane-spark"] }, p1: { board: ["test-if"] } });
    const target = unitAt(s, 1, 0).iid;
    s = act(s, 0, { t: "play", card: s.players[0].hand[0].iid, target }).state; // 6 → 4 (66%): else → +0/+1 (5/7)
    const u1 = unitAt(s, 1, 0);
    expect([getAttack(u1), getHealth(u1), getMaxHealth(u1)]).toEqual([2, 5, 7]);
    s = act(s, 0, { t: "play", card: s.players[0].hand[0].iid, target }).state; // 5 → 3 of 7 (42%): then → +2 attack
    const u2 = unitAt(s, 1, 0);
    expect([getAttack(u2), getHealth(u2)]).toEqual([4, 3]);
  });

  it("unitMatches / isFriendly / isEnemy on subjects", () => {
    const s = makeState({ p0: { board: ["skeleton"] }, p1: { board: ["wolf"] } });
    expect(check(s, { kind: "unitMatches", subject: "self", filter: { tribe: "undead" } })).toBe(true);
    expect(check(s, { kind: "unitMatches", subject: "chosen", filter: { tribe: "undead" } }, { chosen: "c2" })).toBe(false);
    expect(check(s, { kind: "isFriendly", subject: "self" })).toBe(true);
    expect(check(s, { kind: "isEnemy", subject: "chosen" }, { chosen: "c2" })).toBe(true);
    expect(check(s, { kind: "isEnemy", subject: "chosen" }, { chosen: "h1" })).toBe(true);
    expect(check(s, { kind: "isFriendly", subject: "eventTarget" })).toBe(false); // no event → no subject
  });

  it("healthPercent on heroes, heroHealth with sides", () => {
    const s = makeState({ p0: { health: 10 }, p1: { health: 25 } });
    expect(check(s, { kind: "healthPercent", subject: "chosen", op: "lte", percent: 50 }, { chosen: "h0" })).toBe(true);
    expect(check(s, { kind: "heroHealth", side: "friendly", op: "lte", value: 10 })).toBe(true);
    expect(check(s, { kind: "heroHealth", side: "enemy", op: "lte", value: 10 })).toBe(false);
    expect(check(s, { kind: "heroHealth", side: "any", op: "gte", value: 25 })).toBe(true);
  });

  it("diedThisGame and playedThisTurn count per side", () => {
    const s = makeState();
    s.players[0].deaths = { total: 3, byTribe: { undead: 2 } };
    s.players[1].deaths = { total: 1, byTribe: { undead: 1 } };
    s.players[0].turnCounters = { cardsPlayed: 2, spellsCast: 1, mobsPlayed: 1 };
    expect(check(s, { kind: "diedThisGame", side: "friendly", min: 3 })).toBe(true);
    expect(check(s, { kind: "diedThisGame", side: "any", min: 3, filter: { tribe: "undead" } })).toBe(true);
    expect(check(s, { kind: "diedThisGame", side: "enemy", min: 2 })).toBe(false);
    expect(check(s, { kind: "playedThisTurn", side: "friendly", cardType: "spell", min: 1 })).toBe(true);
    expect(check(s, { kind: "playedThisTurn", side: "friendly", min: 3 })).toBe(false);
  });

  it("not / anyOf and checkConditions (AND; empty ⇒ true)", () => {
    const s = makeState({ p0: { board: ["test-1-1"] } });
    const yes: ConditionDef = { kind: "isFriendly", subject: "self" };
    const no: ConditionDef = { kind: "not", condition: yes };
    expect(check(s, no)).toBe(false);
    expect(check(s, { kind: "anyOf", conditions: [no, yes] })).toBe(true);
    const ctx = newCtx(s);
    const a: AbilityContext = { controller: 0, sourceId: "c1", sourceDefId: "test-1-1", depth: 1 };
    expect(checkConditions(ctx, undefined, a)).toBe(true);
    expect(checkConditions(ctx, [yes, no], a)).toBe(false);
  });

  it("an ability whose conditions fail does not activate", () => {
    const s = makeState({ p0: { board: ["test-1-1"], hand: ["squire"] } });
    s.defs["test-1-1"] = {
      ...s.defs["test-1-1"],
      abilities: [{
        id: "big", trigger: { on: "otherSummoned", side: "friendly" },
        conditions: [{ kind: "countAtLeast", selector: { kind: "all", group: "friendlyMobs" }, min: 3 }],
        effects: [{ type: "buff", to: { kind: "self" }, attack: 5 }],
      }],
    } as typeof s.defs[string];
    const r = act(s, 0, { t: "play", card: s.players[0].hand[0].iid });
    expect(r.events.some((e) => e.type === "TRIGGER_ACTIVATED")).toBe(false);
  });

  it("hasStatus is not implemented yet (Phase 18)", () => {
    expect(() => check(makeState({ p0: { board: ["test-1-1"] } }), { kind: "hasStatus", subject: "self", status: "burn" })).toThrow(/not implemented/);
  });
});
