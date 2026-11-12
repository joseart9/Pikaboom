import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../../catalog";
import { MVP_EFFECT_TYPES, type EffectDef } from "../../catalog/types";
import { eventsOf, eventTypes, makeState, unitAt } from "../../testing/fixtures";
import { newCtx } from "../ctx";
import { getHealth } from "../stats";
import type { MatchState } from "../types";
import type { AbilityContext } from "./context";
import { EFFECT_HANDLERS, IMPLEMENTED_EFFECT_TYPES, runEffects } from "./execute";

function run(s: MatchState, effects: EffectDef[], extra: Partial<AbilityContext> = {}) {
  const ctx = newCtx(s);
  runEffects(ctx, effects, { controller: 0, sourceId: "c999", sourceDefId: "test-1-1", depth: 0, ...extra });
  return ctx;
}

describe("EFFECT_HANDLERS", () => {
  it("implements every MVP effect (incl. `if` since Phase 7) and nothing else", () => {
    expect([...IMPLEMENTED_EFFECT_TYPES].sort()).toEqual([...MVP_EFFECT_TYPES].sort());
    expect(EFFECT_HANDLERS.silence).toBeUndefined();
  });

  it("runEffects throws for an effect without a handler", () => {
    const s = makeState();
    expect(() => run(s, [{ type: "silence", to: { kind: "self" } }])).toThrow("Effect not implemented: silence");
  });

  it("runEffects stops once the game is over", () => {
    const s = makeState();
    s.phase = "finished";
    const ctx = run(s, [{ type: "draw", count: 1 }]);
    expect(ctx.events).toEqual([]);
  });
});

describe("handlers", () => {
  it("summon: Desborde stops at the hard limit (10) and reports the rest", () => {
    const s = makeState({ p0: { board: Array(8).fill("test-1-1") } });
    const ctx = run(s, [{ type: "summon", card: "skeleton", count: 4, overflow: true }]);
    expect(s.players[0].board).toHaveLength(10);
    expect(eventsOf(ctx.events, "SUMMON_FIZZLED")).toMatchObject([{ count: 2 }]);
  });

  it("summon: a death-snapshot index is used when the source left the board; enemy side goes to the end", () => {
    const s = makeState({ p0: { board: ["test-1-1", "test-2-3", "test-5-5"] }, p1: { board: ["test-1-1"] } });
    run(s, [{ type: "summon", card: "skeleton", count: 2 }], { sourceId: "c77", sourceIndex: 1 });
    expect(s.players[0].board.map((u) => u.defId)).toEqual(["test-1-1", "skeleton", "skeleton", "test-2-3", "test-5-5"]);
    run(s, [{ type: "summon", card: "wolf", count: 1, side: "enemy" }], { sourceId: "c1" });
    expect(s.players[1].board.map((u) => u.defId)).toEqual(["test-1-1", "wolf"]);
    run(s, [{ type: "summon", card: "wolf", count: 1, position: "end" }], { sourceId: "c1" });
    expect(s.players[0].board.at(-1)?.defId).toBe("wolf");
  });

  it("grantKeyword: booleans set, Escudo adds charges, numeric keeps the max", () => {
    const s = makeState({ p0: { board: [{ defId: "test-1-1", keywords: { shield: 1, thorns: 3 } }] } });
    const ctx = run(s, [
      { type: "grantKeyword", to: { kind: "self" }, keyword: "taunt" },
      { type: "grantKeyword", to: { kind: "self" }, keyword: "shield", value: 2 },
      { type: "grantKeyword", to: { kind: "self" }, keyword: "thorns", value: 2 },
      { type: "grantKeyword", to: { kind: "self" }, keyword: "lifesteal", value: 4 },
    ], { sourceId: "c1" });
    const u = unitAt(s, 0, 0);
    expect(u.keywords).toEqual({ taunt: true, shield: 3, thorns: 3, lifesteal: 4 });
    expect(u.shieldCharges).toBe(3);
    expect(eventTypes(ctx.events)).toEqual(["KEYWORDS_CHANGED", "KEYWORDS_CHANGED", "KEYWORDS_CHANGED", "KEYWORDS_CHANGED"]);
  });

  it("grantKeyword shield on a unit whose Escudo was used up restores the keyword", () => {
    const s = makeState({ p0: { board: ["test-1-1"] } });
    run(s, [{ type: "grantKeyword", to: { kind: "self" }, keyword: "shield", value: 1 }], { sourceId: "c1" });
    expect(unitAt(s, 0, 0)).toMatchObject({ shieldCharges: 1, keywords: { shield: 1 } });
  });

  it("buff: negative health can kill (debuff); heroes are ignored", () => {
    const s = makeState({ p0: { board: ["test-2-3"] } });
    run(s, [{ type: "buff", to: { kind: "all", group: "friendlyCharacters" }, attack: -1, health: -3 }]);
    expect(getHealth(unitAt(s, 0, 0))).toBe(0);
    expect(s.players[0].hero).toEqual({ health: 30, maxHealth: 30 });
  });

  it("destroy flags units; heal/destroy on heroes are no-ops for destroy", () => {
    const s = makeState({ p1: { board: ["test-5-5"] } });
    run(s, [{ type: "destroy", to: { kind: "all", group: "enemyCharacters" } }]);
    expect(unitAt(s, 1, 0).pendingDestroy).toBe(true);
    expect(s.players[1].hero.health).toBe(30);
  });

  it("addToHand creates new private cards; gainMana kinds; draw for the enemy side", () => {
    const s = makeState({ p0: { mana: 3, maxMana: 5 }, p1: { deck: ["squire"] } });
    const ctx = run(s, [
      { type: "addToHand", card: "skeleton", count: 2 },
      { type: "gainMana", amount: 1, kind: "current" },
      { type: "gainMana", amount: 2, kind: "max" },
      { type: "draw", count: 1, side: "enemy" },
    ]);
    expect(s.players[0].hand.map((c) => c.defId)).toEqual(["skeleton", "skeleton"]);
    expect(new Set(s.players[0].hand.map((c) => c.iid)).size).toBe(2);
    expect(eventsOf(ctx.events, "CARD_ADDED_TO_HAND")).toHaveLength(2);
    expect(s.players[0].mana).toMatchObject({ current: 6, max: 7 });
    expect(s.players[1].hand.map((c) => c.defId)).toEqual(["squire"]);
  });

  it("amounts from a count selector", () => {
    const s = makeState({ p0: { board: ["skeleton", "skeleton", "test-1-1"] } });
    run(s, [{ type: "damage", amount: { from: "count", selector: { kind: "all", group: "friendlyMobs", filter: { tribe: "undead" } }, multiplier: 2 }, to: { kind: "hero", side: "enemy" } }]);
    expect(s.players[1].hero.health).toBe(26);
  });
});

describe("no per-card code (Phase 6 K)", () => {
  const engineDir = fileURLToPath(new URL("..", import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return files(p);
      return /\.ts$/.test(name) && !/\.(test|bench)\.ts$/.test(name) ? [p] : [];
    });
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

  it("no engine source file mentions a catalog card id", () => {
    const sources = files(engineDir).map((f) => [f, stripComments(readFileSync(f, "utf8"))] as const);
    expect(sources.length).toBeGreaterThan(20);
    for (const id of Object.keys(CATALOG)) {
      const re = new RegExp(`(?<![\\w-])${id.replace(/-/g, "\\-")}(?![\\w-])`);
      for (const [file, src] of sources) expect(re.test(src), `${id} in ${file}`).toBe(false);
    }
  });
});
