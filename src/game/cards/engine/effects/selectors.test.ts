import { describe, expect, it } from "vitest";
import { makeState, unitAt, type UnitSpec } from "../../testing/fixtures";
import { newCtx } from "../ctx";
import type { MatchState } from "../types";
import type { AbilityContext } from "./context";
import { groupMembers, matchesFilter, resolveSelector, validTargets } from "./selectors";

const mob = (attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec => ({
  defId: "test-1-1", attack, health, ...extra,
});

function abilityCtx(s: MatchState, extra: Partial<AbilityContext> = {}): AbilityContext {
  return { controller: 0, sourceId: "c999", sourceDefId: "test-1-1", depth: 0, ...extra };
}

/** p0 board [c1, c2], p1 board [c3, c4, c5]. */
function fixture(active: 0 | 1 = 0): MatchState {
  return makeState({ active, p0: { board: [mob(1, 1), mob(2, 2)] }, p1: { board: [mob(3, 3), mob(4, 4), mob(5, 5)] } });
}

describe("groupMembers ordering (Phase 6 G.1)", () => {
  it("orders groups as specified, relative to the controller", () => {
    const s = fixture(1); // seat 1 is active
    expect(groupMembers(s, "friendlyMobs", 0)).toEqual(["c1", "c2"]);
    expect(groupMembers(s, "enemyMobs", 0)).toEqual(["c3", "c4", "c5"]);
    expect(groupMembers(s, "allMobs", 0)).toEqual(["c3", "c4", "c5", "c1", "c2"]); // active board first
    expect(groupMembers(s, "friendlyCharacters", 0)).toEqual(["c1", "c2", "h0"]);
    expect(groupMembers(s, "enemyCharacters", 0)).toEqual(["c3", "c4", "c5", "h1"]);
    expect(groupMembers(s, "allCharacters", 0)).toEqual(["c3", "c4", "c5", "c1", "c2", "h1", "h0"]);
    expect(groupMembers(s, "enemyCharacters", 1)).toEqual(["c1", "c2", "h0"]);
  });

  it("skips dead and pendingDestroy units", () => {
    const s = fixture();
    s.players[1].board[0].damage = 3;
    s.players[1].board[2].pendingDestroy = true;
    expect(groupMembers(s, "enemyMobs", 0)).toEqual(["c4"]);
  });
});

describe("matchesFilter", () => {
  it("unit fields: tribe, attack bounds, cost, damaged, keyword, defId", () => {
    const s = makeState({ p0: { board: ["skeleton", "wolf-pup", mob(3, 4, { damage: 1 })] } });
    expect(matchesFilter(s, "c1", { tribe: "undead" })).toBe(true);
    expect(matchesFilter(s, "c2", { tribe: "undead" })).toBe(false);
    expect(matchesFilter(s, "c3", { maxAttack: 3, minAttack: 3 })).toBe(true);
    expect(matchesFilter(s, "c3", { maxAttack: 2 })).toBe(false);
    expect(matchesFilter(s, "c2", { maxCost: 1 })).toBe(true);
    expect(matchesFilter(s, "c3", { damaged: true })).toBe(true);
    expect(matchesFilter(s, "c1", { damaged: true })).toBe(false);
    expect(matchesFilter(s, "c2", { hasKeyword: "rush" })).toBe(true);
    expect(matchesFilter(s, "c1", { defId: "skeleton" })).toBe(true);
  });

  it("heroes match only `damaged`; any other field excludes them", () => {
    const s = makeState({ p0: { health: 20 } });
    expect(matchesFilter(s, "h0", { damaged: true })).toBe(true);
    expect(matchesFilter(s, "h1", { damaged: true })).toBe(false);
    expect(matchesFilter(s, "h0", { tribe: "undead" })).toBe(false);
    expect(matchesFilter(s, "h0", { maxAttack: 10 })).toBe(false);
    expect(matchesFilter(s, "h0", undefined)).toBe(true);
  });
});

describe("resolveSelector", () => {
  it("self / chosen / hero; dead subjects resolve to nothing", () => {
    const s = fixture();
    const ctx = newCtx(s);
    expect(resolveSelector(ctx, { kind: "self" }, abilityCtx(s, { sourceId: "c2" }))).toEqual(["c2"]);
    expect(resolveSelector(ctx, { kind: "self" }, abilityCtx(s, { sourceId: "c77" }))).toEqual([]); // spell card iid
    expect(resolveSelector(ctx, { kind: "chosen" }, abilityCtx(s, { chosen: "h1" }))).toEqual(["h1"]);
    expect(resolveSelector(ctx, { kind: "chosen" }, abilityCtx(s))).toEqual([]);
    expect(resolveSelector(ctx, { kind: "hero", side: "enemy" }, abilityCtx(s, { controller: 1 }))).toEqual(["h0"]);
    s.players[1].board[0].damage = 5;
    expect(resolveSelector(ctx, { kind: "chosen" }, abilityCtx(s, { chosen: "c3" }))).toEqual([]);
  });

  it("all with excludeSelf / excludeChosen / filter", () => {
    const s = fixture();
    const ctx = newCtx(s);
    const a = abilityCtx(s, { sourceId: "c1", chosen: "c4" });
    expect(resolveSelector(ctx, { kind: "all", group: "allMobs", excludeSelf: true }, a)).toEqual(["c2", "c3", "c4", "c5"]);
    expect(resolveSelector(ctx, { kind: "all", group: "enemyMobs", excludeChosen: true }, a)).toEqual(["c3", "c5"]);
    expect(resolveSelector(ctx, { kind: "all", group: "allCharacters", filter: { minAttack: 4 } }, a)).toEqual(["c4", "c5"]);
  });

  it("random picks distinct candidates; fewer candidates ⇒ all; none ⇒ no RNG use", () => {
    const s = fixture();
    const ctx = newCtx(s);
    const picks = resolveSelector(ctx, { kind: "random", group: "enemyCharacters", count: 3 }, abilityCtx(s));
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
    const all = resolveSelector(ctx, { kind: "random", group: "friendlyMobs", count: 5 }, abilityCtx(s));
    expect([...all].sort()).toEqual(["c1", "c2"]);
    const rng = [...s.rng];
    expect(resolveSelector(ctx, { kind: "random", group: "enemyMobs", count: 2, filter: { minAttack: 9 } }, abilityCtx(s))).toEqual([]);
    expect(s.rng).toEqual(rng);
  });

  it("adjacent = index ±1 on the reference unit's board, living units only", () => {
    const s = fixture();
    const ctx = newCtx(s);
    expect(resolveSelector(ctx, { kind: "adjacent", of: "chosen" }, abilityCtx(s, { chosen: "c4" }))).toEqual(["c3", "c5"]);
    expect(resolveSelector(ctx, { kind: "adjacent", of: "chosen" }, abilityCtx(s, { chosen: "c3" }))).toEqual(["c4"]);
    expect(resolveSelector(ctx, { kind: "adjacent", of: "self" }, abilityCtx(s, { sourceId: "c1" }))).toEqual(["c2"]);
    s.players[1].board[2].pendingDestroy = true;
    expect(resolveSelector(ctx, { kind: "adjacent", of: "chosen" }, abilityCtx(s, { chosen: "c4" }))).toEqual(["c3"]);
    expect(resolveSelector(ctx, { kind: "adjacent", of: "eventTarget" }, abilityCtx(s))).toEqual([]);
  });

  it("eventSource / eventTarget read the triggering event", () => {
    const s = fixture();
    const ctx = newCtx(s);
    const event = { type: "DAMAGE", seq: 1, step: 0, source: "c1", target: "c4", amount: 1, dealt: 1, kind: "combat", blocked: null, healthAfter: 3 } as const;
    expect(resolveSelector(ctx, { kind: "eventSource" }, abilityCtx(s, { event }))).toEqual(["c1"]);
    expect(resolveSelector(ctx, { kind: "eventTarget" }, abilityCtx(s, { event }))).toEqual(["c4"]);
  });
});

describe("validTargets", () => {
  it("is the filtered group, never the card itself", () => {
    const s = fixture();
    expect(validTargets(s, 0, { group: "enemyMobs", filter: { maxAttack: 4 } }, "c99")).toEqual(["c3", "c4"]);
    expect(validTargets(s, 0, { group: "friendlyMobs" }, "c1")).toEqual(["c2"]);
    expect(unitAt(s, 0, 0).iid).toBe("c1");
  });
});
