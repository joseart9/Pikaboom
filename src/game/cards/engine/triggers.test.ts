import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import { validateCatalog } from "../catalog/validate";
import type { CardId, MobCardDef } from "../catalog/types";
import { es } from "../i18n/es";
import { act, eventsOf, eventTypes, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { TEST_DEFS } from "../testing/testCards";
import { getAttack, getHealth } from "./stats";
import type { MatchState, Seat } from "./types";

const mob = (attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec => ({
  defId: "test-1-1", attack, health, ...extra,
});

function play(s: MatchState, defId: CardId, extra: { target?: string; position?: number } = {}) {
  const seat = s.turn.activeSeat;
  const card = s.players[seat].hand.find((c) => c.defId === defId)!.iid;
  return act(s, seat, { t: "play", card, ...extra });
}

function atk(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

function testMob(id: string, abilities: MobCardDef["abilities"], attack = 1, health = 30): MobCardDef {
  return { id, version: 1, type: "mob", set: "core", cost: 1, rarity: "common", collectible: false, art: id, attack, health, tribes: [], keywords: {}, abilities };
}

describe("test cards", () => {
  it("TEST_DEFS are valid card definitions", () => {
    const dict = { ...es.cards };
    for (const id of Object.keys(TEST_DEFS)) dict[id] = { name: id, text: "" };
    expect(validateCatalog({ ...CATALOG, ...TEST_DEFS }, dict)).toEqual([]);
  });
});

describe("otherSummoned (alpha-wolf)", () => {
  it("row 6: alpha-wolf + pack-call → both wolves 3/2", () => {
    const s = makeState({ p0: { board: ["alpha-wolf"], hand: ["pack-call"] } });
    const r = play(s, "pack-call");
    expect(r.state.players[0].board.slice(1).map((u) => [u.defId, getAttack(u), getHealth(u)])).toEqual([
      ["wolf", 3, 2],
      ["wolf", 3, 2],
    ]);
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(2);
    // Triggers resolve after the spell (queued), each with the summoned wolf as eventTarget.
    expect(eventTypes(r.events).indexOf("SPELL_CAST")).toBeLessThan(eventTypes(r.events).indexOf("TRIGGER_ACTIVATED"));
  });

  it("row 7: playing a second alpha-wolf buffs the new one only", () => {
    const s = makeState({ p0: { board: ["alpha-wolf"], hand: ["alpha-wolf"] } });
    const r = play(s, "alpha-wolf");
    expect(r.state.players[0].board.map(getAttack)).toEqual([2, 3]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toMatchObject([{ sourceId: unitAt(s, 0, 0).iid, abilityId: "packLeader" }]);
  });

  it("does not react to enemy or non-Beast summons", () => {
    const s = makeState({ p0: { board: ["alpha-wolf"], hand: ["squire"] }, active: 0 });
    const r = play(s, "squire");
    expect(getAttack(unitAt(r.state, 0, 1))).toBe(1);
    const e = makeState({ active: 1, p0: { board: ["alpha-wolf"] }, p1: { hand: ["pack-call"] } });
    expect(eventsOf(play(e, "pack-call").events, "TRIGGER_ACTIVATED")).toEqual([]);
  });

  it("a silenced listener does not trigger", () => {
    const s = makeState({ p0: { board: ["alpha-wolf"], hand: ["pack-call"] } });
    s.players[0].board[0].silenced = true;
    expect(eventsOf(play(s, "pack-call").events, "TRIGGER_ACTIVATED")).toEqual([]);
  });
});

describe("Grito de Guerra with triggers", () => {
  it("row 12: ignis hits all 3 enemy mobs and the hero for 3", () => {
    const s = makeState({ p0: { hand: ["ignis"] }, p1: { board: [mob(1, 9), mob(1, 9), mob(1, 9)] } });
    const r = play(s, "ignis");
    expect(r.state.players[1].board.map(getHealth)).toEqual([6, 6, 6]);
    expect(r.state.players[1].hero.health).toBe(27);
  });
});

describe("chain limits (§8.8)", () => {
  it("row 13: the recursive echo pair terminates at the board hard limit without throwing", () => {
    const s = makeState({ p0: { board: ["test-echo-a"], hand: ["test-echo-a"] } });
    const r = play(s, "test-echo-a");
    expect(r.state.players[0].board.length).toBeLessThanOrEqual(10);
    expect(r.state.players[0].board).toHaveLength(10);
    const types = eventTypes(r.events);
    expect(types.includes("SUMMON_FIZZLED") || types.includes("CHAIN_LIMIT_REACHED")).toBe(true);
  });

  it("an endless ping-pong stops at the depth limit with one CHAIN_LIMIT_REACHED", () => {
    // Each unit, when damaged, deals 1 to the enemy mobs → the other unit → … forever without limits.
    const pinger = testMob("test-pinger", [{ id: "ping", trigger: { on: "damageTaken" }, effects: [{ type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } }] }]);
    const s = makeState({ defs: { [pinger.id]: pinger }, p0: { board: [{ defId: "test-pinger", health: 99 }], hand: ["arcane-spark"] }, p1: { board: [{ defId: "test-pinger", health: 99 }] } });
    const r = play(s, "arcane-spark", { target: unitAt(s, 1, 0).iid });
    expect(eventsOf(r.events, "CHAIN_LIMIT_REACHED")).toHaveLength(1);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toHaveLength(s.rules.chain.maxDepth);
    expect(r.state.phase).toBe("playing");
  });

  it("a branching loop stops at the per-command resolution cap", () => {
    // 3 pingers per side: each hit triggers 3 more hits → the 500-resolution cap is reached before depth 32.
    const pinger = testMob("test-pinger", [{ id: "ping", trigger: { on: "damageTaken" }, effects: [{ type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } }] }]);
    const side = () => Array.from({ length: 3 }, () => ({ defId: "test-pinger", health: 999 }));
    const s = makeState({ defs: { [pinger.id]: pinger }, p0: { board: side(), hand: ["arcane-spark"] }, p1: { board: side() } });
    const r = play(s, "arcane-spark", { target: unitAt(s, 1, 0).iid });
    expect(eventsOf(r.events, "CHAIN_LIMIT_REACHED")).toHaveLength(1);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toHaveLength(s.rules.chain.maxResolutionsPerCommand + 1);
  });

  it("row 14: limit.perTurn 1 — three triggers in a turn apply once; next turn once again", () => {
    let s = makeState({ p0: { board: ["test-limited"], hand: ["pack-call", "test-1-1", "test-1-1", "test-1-1"] } });
    s = play(s, "pack-call").state;
    s = play(s, "test-1-1").state;
    expect(getAttack(unitAt(s, 0, 0))).toBe(2);
    s = act(s, 0, { t: "endTurn" }).state;
    s = act(s, 1, { t: "endTurn" }).state;
    s = play(s, "test-1-1").state;
    s = play(s, "test-1-1").state;
    expect(getAttack(unitAt(s, 0, 0))).toBe(3);
    expect(unitAt(s, 0, 0).abilityUses.grow).toMatchObject({ thisTurn: 1, total: 2 });
  });

  it("limit.perGame caps total activations", () => {
    const once = testMob("test-once", [{ id: "once", trigger: { on: "otherSummoned", side: "friendly" }, limit: { perGame: 1 }, effects: [{ type: "buff", to: { kind: "self" }, attack: 1 }] }]);
    let s = makeState({ defs: { [once.id]: once }, p0: { board: ["test-once"], hand: ["pack-call"] } });
    s = play(s, "pack-call").state;
    expect(getAttack(unitAt(s, 0, 0))).toBe(2);
  });
});

describe("turn, draw and spell triggers", () => {
  it("row 17: lethal trigger damage ends the game; later queued triggers and the draw do not run", () => {
    const s = makeState({ p0: { health: 1 }, p1: { board: ["test-turnstart-dmg", "test-turnstart-dmg"], deck: ["squire"] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state).toMatchObject({ phase: "finished", winner: 1, endReason: "hero_destroyed" });
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toHaveLength(1);
    expect(eventsOf(r.events, "CARD_DRAWN")).toEqual([]);
    expect(eventTypes(r.events).at(-1)).toBe("GAME_OVER");
  });

  it("turnStart own fires only on its controller's turn, before the draw", () => {
    let s = makeState({ p0: { board: ["test-turnstart-dmg"], deck: ["squire", "squire"] }, p1: { deck: ["squire"] } });
    let r = act(s, 0, { t: "endTurn" }); // seat 1's turn starts: no ping
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
    s = r.state;
    r = act(s, 1, { t: "endTurn" }); // seat 0's turn starts: ping, then draw
    const types = eventTypes(r.events);
    expect(types.indexOf("TRIGGER_ACTIVATED")).toBeGreaterThan(types.indexOf("TURN_STARTED"));
    expect(types.indexOf("TRIGGER_ACTIVATED")).toBeLessThan(types.indexOf("CARD_DRAWN"));
    expect(r.state.players[1].hero.health).toBe(29);
  });

  it("turnEnd / cardDrawn / spellCast / healed triggers match `whose` and the subject", () => {
    const watcher = testMob("test-watcher", [
      { id: "end", trigger: { on: "turnEnd", whose: "enemy" }, effects: [{ type: "buff", to: { kind: "self" }, attack: 1 }] },
      { id: "drawn", trigger: { on: "cardDrawn", whose: "own" }, effects: [{ type: "buff", to: { kind: "self" }, health: 1 }] },
      { id: "spell", trigger: { on: "spellCast", whose: "any" }, effects: [{ type: "buff", to: { kind: "self" }, attack: 10 }] },
      { id: "healed", trigger: { on: "healed" }, effects: [{ type: "damage", amount: 1, to: { kind: "hero", side: "enemy" } }] },
    ], 0, 5);
    let s = makeState({ defs: { [watcher.id]: watcher }, active: 1, p0: { board: [{ defId: "test-watcher", damage: 2 }], deck: ["squire"] }, p1: { hand: ["arcane-spark"] } });
    let r = play(s, "arcane-spark", { target: "h0" }); // spellCast any → +10 attack
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(10);
    r = act(r.state, 1, { t: "endTurn" }); // enemy turn end → +1 attack; own draw → +1 health
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(11);
    expect(unitAt(r.state, 0, 0).modifiers.filter((m) => m.health === 1)).toHaveLength(1);
    s = r.state;
    s.players[0].hand.push({ iid: "c80", defId: "healing-touch", costMod: 0 });
    r = act(s, 0, { t: "play", card: "c80", target: unitAt(s, 0, 0).iid }); // healed → 1 damage to enemy hero
    expect(r.state.players[1].hero.health).toBe(s.players[1].hero.health - 1);
  });

  it("summoned / attack / damageDealt / damageTaken triggers", () => {
    const probe = testMob("test-probe", [
      { id: "summoned", trigger: { on: "summoned" }, effects: [{ type: "draw", count: 1 }] },
      { id: "attack", trigger: { on: "attack" }, effects: [{ type: "buff", to: { kind: "self" }, attack: 1 }] },
      { id: "dealt", trigger: { on: "damageDealt", combatOnly: true }, effects: [{ type: "heal", amount: 5, to: { kind: "hero", side: "friendly" } }] },
      { id: "taken", trigger: { on: "damageTaken" }, effects: [{ type: "damage", amount: 1, to: { kind: "eventSource" } }] },
    ], 2, 10);
    let s = makeState({ defs: { [probe.id]: probe }, p0: { hand: ["test-probe"], deck: ["squire"], health: 20, board: [] }, p1: { board: [mob(1, 9)] } });
    let r = play(s, "test-probe");
    expect(r.state.players[0].hand.map((c) => c.defId)).toEqual(["squire"]); // summoned → draw
    s = r.state;
    s.players[0].board[0].summonedTurn = 0; // wake it up
    r = atk(s, [0, 0], [1, 0]);
    // attack → +1 (3 attack) before damage; dealt → heal 5; taken (retaliation 1) → 1 damage back to the defender.
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(9 - 3 - 1);
    expect(r.state.players[0].hero.health).toBe(25);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED").map((e) => e.abilityId)).toEqual(["attack", "dealt", "taken"]);
  });

  it("an `attacked` trigger that removes the attacker cancels the attack (ATTACK_CANCELLED)", () => {
    const s = makeState({ p0: { board: [mob(5, 5)] }, p1: { board: ["test-guardian"] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(eventTypes(r.events)).toEqual(["ATTACK_DECLARED", "TRIGGER_ACTIVATED", "MOB_DESTROYED", "ATTACK_CANCELLED"]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(5);
    expect(r.state.players[0].board).toHaveLength(0);
  });

  it("trigger order: listeners in board order (active seat first), then FIFO", () => {
    const counter = testMob("test-counter", [{ id: "c", trigger: { on: "otherSummoned", side: "any" }, effects: [{ type: "buff", to: { kind: "self" }, attack: 1 }] }]);
    const s = makeState({ defs: { [counter.id]: counter }, active: 1, p0: { board: ["test-counter", "test-counter"] }, p1: { board: ["test-counter"], hand: ["squire"] } });
    const r = play(s, "squire");
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED").map((e) => e.sourceId)).toEqual([unitAt(s, 1, 0).iid, unitAt(s, 0, 0).iid, unitAt(s, 0, 1).iid]);
  });
});
