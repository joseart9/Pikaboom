// Phase 19: Veneno, Sigilo, Escudo Divino, Vuelo; transform, resurrect, returnToHand, changeControl, copyToHand,
// stealFromHand, modifyMana; and a behavior test for every new card (incl. the toad and scrap-golem tokens).
import { describe, expect, it } from "vitest";
import type { CardDef, CardId, EffectDef, StatusId } from "../catalog/types";
import { act, eventsOf, eventTypes, handIds, makeState, unitAt, type SideSpec, type UnitSpec } from "../testing/fixtures";
import { newCtx } from "./ctx";
import type { AbilityContext } from "./effects/context";
import { runEffects } from "./effects/execute";
import { getLegalActions } from "./legal";
import { resolveAll } from "./resolve";
import { getAttack, getHealth, isSleeping } from "./stats";
import type { MatchState, Seat, StatusInstance } from "./types";

const mob = (attack: number, health: number, extra: Partial<UnitSpec> = {}): UnitSpec => ({ defId: "test-1-1", attack, health, ...extra });
const st = (id: StatusId, magnitude = 0): StatusInstance => ({ id, magnitude, expiresAfterTurn: 99, sourceId: "c99", appliedTurn: 1 });

function play(s: MatchState, seat: Seat, defId: CardId, target?: string) {
  const card = s.players[seat].hand.find((c) => c.defId === defId);
  if (!card) throw new Error(`no ${defId} in hand`);
  return act(s, seat, target === undefined ? { t: "play", card: card.iid } : { t: "play", card: card.iid, target });
}

function attack(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

function endTurn(s: MatchState): MatchState {
  return act(s, s.turn.activeSeat, { t: "endTurn" }).state;
}

/** Runs effects as an ability of seat 0 (mutates `s`), then settles deaths and queued triggers. */
function run(s: MatchState, effects: EffectDef[], extra: Partial<AbilityContext> = {}) {
  const ctx = newCtx(s);
  runEffects(ctx, effects, { controller: 0, sourceId: "c999", sourceDefId: "test-1-1", depth: 0, ...extra });
  resolveAll(ctx);
  return ctx;
}

const attacksOf = (s: MatchState, seat: Seat, index: number) => getLegalActions(s, seat).attacks[unitAt(s, seat, index).iid] ?? [];
const defIds = (s: MatchState, seat: Seat) => s.players[seat].board.map((u) => u.defId);

/** Test-only mob defs with arbitrary keywords/abilities (passed through makeState's `defs`). */
function testMob(id: string, attack: number, health: number, extra: Partial<Extract<CardDef, { type: "mob" }>> = {}): CardDef {
  return {
    id, version: 1, type: "mob", set: "core", cost: 1, rarity: "common", collectible: false, art: id,
    attack, health, tribes: [], keywords: {}, abilities: [], ...extra,
  };
}

// ── Keywords (§7.1 V1 rows) ──────────────────────────────────────────────────────────────────────────

describe("Veneno", () => {
  it("an attacker with Veneno destroys the unit it damages, whatever its health", () => {
    const s = makeState({ p0: { board: ["venom-spider"] }, p1: { board: [mob(0, 20)] } });
    const r = attack(s, [0, 0], [1, 0]);
    expect(r.state.players[1].board).toEqual([]);
    expect(eventsOf(r.events, "MOB_DESTROYED").map((e) => e.seat)).toEqual([1]);
  });

  it("retaliation from a Veneno defender destroys the attacker", () => {
    const s = makeState({ p0: { board: [mob(5, 20)] }, p1: { board: ["venom-spider"] } });
    const r = attack(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toEqual([]);
    expect(r.state.players[1].board).toEqual([]);
  });

  it("damage prevented by Escudo, Escudo Divino or Inmune does not poison (edge case)", () => {
    const s = makeState({
      p0: { board: [{ defId: "venom-spider", attacksThisTurn: 0 }] },
      p1: { board: [mob(0, 5, { keywords: { shield: 1 } }), mob(0, 5, { keywords: { divineShield: true } }), mob(0, 5, { statuses: [st("immune")] })] },
    });
    s.players[0].board[0].keywords.doubleStrike = true;
    let r = attack(s, [0, 0], [1, 0]);
    expect(r.state.players[1].board).toHaveLength(3);
    expect(unitAt(r.state, 1, 0).shieldCharges).toBe(0);
    r = attack(r.state, [0, 0], [1, 1]);
    expect(r.state.players[1].board).toHaveLength(3);
    expect(unitAt(r.state, 1, 1).keywords.divineShield).toBeUndefined();
    const ctx = run(r.state, [{ type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } }], { sourceId: unitAt(r.state, 0, 0).iid });
    // The 1-damage effect now lands on the first two (no protection left) but not on the Inmune one.
    expect(ctx.s.players[1].board.map((u) => u.statuses.map((x) => x.id))).toEqual([["immune"]]);
  });

  it("a Veneno attacker hitting a hero only deals its damage (edge case)", () => {
    const s = makeState({ p0: { board: ["venom-spider"] } });
    const r = attack(s, [0, 0], "h1");
    expect(r.state.players[1].hero.health).toBe(29);
    expect(r.state.phase).toBe("playing");
  });

  it("effect damage from the Veneno unit's own ability poisons too; Barrido splash poisons every unit hit", () => {
    const s = makeState({ p0: { board: ["venom-spider"] }, p1: { board: [mob(0, 9), mob(0, 9)] } });
    run(s, [{ type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } }], { sourceId: unitAt(s, 0, 0).iid });
    expect(s.players[1].board).toEqual([]);

    const s2 = makeState({ p0: { board: [mob(1, 9, { keywords: { poison: true, cleave: true } })] }, p1: { board: [mob(0, 9), mob(0, 9), mob(0, 9)] } });
    const r = attack(s2, [0, 0], [1, 1]);
    expect(r.state.players[1].board).toEqual([]);
  });
});

describe("Sigilo", () => {
  it("enemy units with Sigilo cannot be attacked", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: ["shadow-stalker"] } });
    expect(attacksOf(s, 0, 0)).toEqual(["h1"]);
    expect(() => attack(s, [0, 0], [1, 0])).toThrow("invalid_target");
  });

  it("Sigilo + Provocar: the unit is not targetable, so its Provocar is ignored (edge case)", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: { stealth: true, taunt: true } }), mob(1, 1)] } });
    expect(attacksOf(s, 0, 0)).toEqual([unitAt(s, 1, 1).iid, "h1"]);
    expect(attack(s, [0, 0], "h1").state.players[1].hero.health).toBe(27);
  });

  it("cannot be the enemy's chosen target, but its controller may choose it", () => {
    const s = makeState({ p0: { hand: ["flame-lance"] }, p1: { board: ["shadow-stalker", mob(1, 9)], hand: ["flame-lance"] } });
    const lance = s.players[0].hand[0].iid;
    expect(getLegalActions(s, 0).play[lance].targets).toEqual([unitAt(s, 1, 1).iid]);
    expect(() => play(s, 0, "flame-lance", unitAt(s, 1, 0).iid)).toThrow("invalid_target");
    const theirs = makeState({ active: 1, p1: { board: ["shadow-stalker"], hand: ["flame-lance"] } });
    expect(getLegalActions(theirs, 1).play[theirs.players[1].hand[0].iid].targets).toEqual([unitAt(theirs, 1, 0).iid]);
  });

  it("random and area selectors still hit it", () => {
    const s = makeState({ p0: { hand: ["bone-storm", "storm-drake"] }, p1: { board: ["shadow-stalker", mob(1, 9)] } });
    let r = play(s, 0, "storm-drake");
    // The only... two candidates: either may be stunned; the area spell then kills the stalker.
    expect(eventsOf(r.events, "STATUS_APPLIED")).toHaveLength(1);
    r = play(r.state, 0, "bone-storm");
    expect(defIds(r.state, 1)).toEqual(["test-1-1"]);
  });

  it("is lost when the unit attacks (before ATTACK_DECLARED)", () => {
    const s = makeState({ p0: { board: ["shadow-stalker"] } });
    const r = attack(s, [0, 0], "h1");
    expect(eventTypes(r.events).slice(0, 2)).toEqual(["KEYWORDS_CHANGED", "ATTACK_DECLARED"]);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({});
  });

  it("is lost when the unit deals damage through its own ability, kept when its ability deals none (edge case)", () => {
    const pinger = testMob("test-stealth-pinger", 1, 3, {
      keywords: { stealth: true },
      abilities: [{ id: "ping", trigger: { on: "turnEnd", whose: "own" }, effects: [{ type: "damage", amount: 1, to: { kind: "hero", side: "enemy" } }] }],
    });
    const healer = testMob("test-stealth-healer", 1, 3, {
      keywords: { stealth: true },
      abilities: [{ id: "mend", trigger: { on: "turnEnd", whose: "own" }, effects: [{ type: "heal", amount: 1, to: { kind: "hero", side: "friendly" } }] }],
    });
    const s = makeState({ defs: { [pinger.id]: pinger, [healer.id]: healer }, p0: { board: [pinger.id, healer.id], health: 20 }, p1: { deck: ["squire"] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state.players[1].hero.health).toBe(29);
    expect(unitAt(r.state, 0, 0).keywords.stealth).toBeUndefined();
    expect(unitAt(r.state, 0, 1).keywords.stealth).toBe(true);
    expect(eventsOf(r.events, "KEYWORDS_CHANGED").map((e) => e.iid)).toEqual([unitAt(s, 0, 0).iid]);
  });
});

describe("Escudo Divino", () => {
  it("prevents the next damage instance of any kind, then is removed", () => {
    const s = makeState({ p0: { hand: ["arcane-spark", "arcane-spark"] }, p1: { board: ["sun-cleric"] } });
    const target = unitAt(s, 1, 0).iid;
    let r = play(s, 0, "arcane-spark", target);
    expect(eventsOf(r.events, "DAMAGE")).toEqual([expect.objectContaining({ target, dealt: 0, blocked: "divine" })]);
    expect(eventsOf(r.events, "KEYWORDS_CHANGED")).toEqual([expect.objectContaining({ iid: target, keywords: {} })]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(2);
    r = play(r.state, 0, "arcane-spark", target);
    expect(r.state.players[1].board).toEqual([]);
  });

  it("blocks a combat hit (and the defender still retaliates)", () => {
    const s = makeState({ p0: { board: [mob(3, 5)] }, p1: { board: ["sun-cleric"] } });
    const r = attack(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(2);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(3);
  });

  it("is checked after Escudo: a combat hit spends an Escudo charge first", () => {
    const s = makeState({ p0: { board: [mob(3, 9, { keywords: { doubleStrike: true } })] }, p1: { board: [mob(0, 5, { keywords: { shield: 1, divineShield: true } })] } });
    let r = attack(s, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ blocked: "shield" });
    expect(unitAt(r.state, 1, 0).keywords).toEqual({ divineShield: true });
    r = attack(r.state, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ blocked: "divine" });
    expect(unitAt(r.state, 1, 0).keywords).toEqual({});
  });

  it("Inmune comes first (Escudo Divino kept); Vulnerabilidad does not get through", () => {
    const s = makeState({ p0: { hand: ["arcane-spark", "arcane-spark"] }, p1: { board: [mob(0, 5, { keywords: { divineShield: true }, statuses: [st("immune")] }), mob(0, 5, { keywords: { divineShield: true }, statuses: [st("vulnerability", 2)] })] } });
    let r = play(s, 0, "arcane-spark", unitAt(s, 1, 0).iid);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ blocked: "immune" });
    expect(unitAt(r.state, 1, 0).keywords.divineShield).toBe(true);
    r = play(r.state, 0, "arcane-spark", unitAt(s, 1, 1).iid);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ amount: 4, dealt: 0, blocked: "divine" });
  });
});

describe("Vuelo", () => {
  it("a flying attacker ignores Provocar of units without Vuelo; others are still bound", () => {
    const s = makeState({ p0: { board: ["ash-drake", mob(2, 2)] }, p1: { board: ["shield-bearer", mob(1, 1)] } });
    expect(attacksOf(s, 0, 0)).toEqual([unitAt(s, 1, 0).iid, unitAt(s, 1, 1).iid, "h1"]);
    expect(attacksOf(s, 0, 1)).toEqual([unitAt(s, 1, 0).iid]);
    expect(attack(s, [0, 0], "h1").state.players[1].hero.health).toBe(26);
    expect(() => attack(s, [0, 1], "h1")).toThrow("must_attack_taunt");
  });

  it("Provocar on a flying unit still binds a flying attacker (unless that unit has Sigilo)", () => {
    const s = makeState({ p0: { board: ["ash-drake"] }, p1: { board: [mob(1, 5, { keywords: { taunt: true, flying: true } }), mob(1, 1)] } });
    expect(attacksOf(s, 0, 0)).toEqual([unitAt(s, 1, 0).iid]);
    expect(() => attack(s, [0, 0], "h1")).toThrow("must_attack_taunt");
    unitAt(s, 1, 0).keywords.stealth = true;
    expect(attacksOf(s, 0, 0)).toEqual([unitAt(s, 1, 1).iid, "h1"]);
  });
});

// ── Effects (Phase 19 F table) ───────────────────────────────────────────────────────────────────────

describe("transform", () => {
  it("replaces the unit in place: new iid and stats, damage/modifiers/statuses/silence cleared, sleep kept, no triggers, no death", () => {
    const s = makeState({
      p0: { hand: ["toad-hex"] },
      p1: { board: ["alpha-wolf", { defId: "forest-boar", damage: 1, sleeping: true, statuses: [st("burn", 2)], modifiers: [{ attack: 2, health: 2, expires: "never", sourceId: "c99" }] }, mob(1, 1)] },
    });
    unitAt(s, 1, 1).silenced = true;
    const old = unitAt(s, 1, 1).iid;
    const r = play(s, 0, "toad-hex", old);
    const toad = unitAt(r.state, 1, 1);
    expect(defIds(r.state, 1)).toEqual(["alpha-wolf", "toad", "test-1-1"]);
    expect(toad.iid).not.toBe(old);
    expect(toad).toMatchObject({ controller: 1, owner: 1, baseAttack: 1, baseHealth: 1, damage: 0, modifiers: [], statuses: [], silenced: false });
    expect(isSleeping(r.state, toad)).toBe(true);
    expect(eventsOf(r.events, "MOB_TRANSFORMED")).toEqual([expect.objectContaining({ iid: old, unit: expect.objectContaining({ iid: toad.iid, defId: "toad", attack: 1, health: 1 }) })]);
    // Not a summon (Lobo Alfa does not react to the new Beast) and not a death.
    for (const t of ["MOB_SUMMONED", "MOB_DESTROYED", "TRIGGER_ACTIVATED"] as const) expect(eventsOf(r.events, t), t).toEqual([]);
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(2);
    expect(r.state.players[1].graveyard).toEqual([]);
  });

  it("triggers already queued for the old iid fizzle (edge case)", () => {
    const hurt = testMob("test-hurt-ping", 1, 5, {
      abilities: [{ id: "ping", trigger: { on: "damageTaken" }, effects: [{ type: "damage", amount: 1, to: { kind: "hero", side: "enemy" } }] }],
    });
    const s = makeState({ defs: { [hurt.id]: hurt }, p1: { board: [hurt.id] } });
    const ctx = run(s, [
      { type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } },
      { type: "transform", to: { kind: "all", group: "enemyMobs" }, card: "toad" },
    ]);
    expect(eventsOf(ctx.events, "TRIGGER_ACTIVATED")).toEqual([]);
    expect(s.players[0].hero.health).toBe(30);
    // Control: without the transform the trigger fires.
    const s2 = makeState({ defs: { [hurt.id]: hurt }, p1: { board: [hurt.id] } });
    run(s2, [{ type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } }]);
    expect(s2.players[0].hero.health).toBe(29);
  });

  it("Larva de Dragón evolves at the start of its controller's turn and may attack right away", () => {
    let s = makeState({ p0: { board: [{ defId: "larval-drake", sleeping: true }] } });
    s = endTurn(s); // turn 2 (seat 1): no evolution on the enemy's turn
    expect(defIds(s, 0)).toEqual(["larval-drake"]);
    const r = act(s, 1, { t: "endTurn" }); // turn 3 (seat 0)
    expect(eventsOf(r.events, "MOB_TRANSFORMED")).toHaveLength(1);
    expect(defIds(r.state, 0)).toEqual(["ash-drake"]);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({ flying: true });
    expect(attacksOf(r.state, 0, 0)).toEqual(["h1"]);
  });
});

describe("resurrect", () => {
  const grave = (s: MatchState, seat: Seat, ...ids: CardId[]) =>
    ids.forEach((defId, i) => s.players[seat].graveyard.push({ iid: `c${900 + i}`, defId, diedTurn: 0 }));

  it("Alzar a los Muertos: the two most recent friendly Undead, fresh, sleeping, cause resurrect; the graveyard keeps them", () => {
    const s = makeState({ p0: { hand: ["raise-dead"], board: [mob(1, 1)] } });
    grave(s, 0, "skeleton", "wolf", "restless-skeleton", "squire");
    const r = play(s, 0, "raise-dead");
    expect(defIds(r.state, 0)).toEqual(["test-1-1", "restless-skeleton", "skeleton"]);
    const summoned = eventsOf(r.events, "MOB_SUMMONED");
    expect(summoned.map((e) => [e.cause, e.unit.sleeping, e.unit.health])).toEqual([["resurrect", true, 1], ["resurrect", true, 1]]);
    expect(r.state.players[0].graveyard).toHaveLength(4);
  });

  it("no Grito de Guerra; `summoned` triggers fire; enemy side; fewer entries than count", () => {
    const s = makeState({ p1: { board: [mob(1, 9)] } });
    grave(s, 0, "phoenix-chick", "grave-digger");
    grave(s, 1, "squire");
    const ctx = run(s, [{ type: "resurrect", count: 3 }, { type: "resurrect", side: "enemy", count: 1 }]);
    expect(defIds(s, 0)).toEqual(["grave-digger", "phoenix-chick"]); // no Esqueleto from the Sepulturero
    expect(eventsOf(ctx.events, "TRIGGER_ACTIVATED").map((e) => e.abilityId)).toEqual(["ignite"]);
    expect(defIds(s, 1)).toEqual(["test-1-1", "squire"]);
  });

  it("respects the board limit: the rest fizzles", () => {
    const s = makeState({ p0: { hand: ["raise-dead"], board: Array(5).fill("test-1-1") } });
    grave(s, 0, "skeleton", "skeleton");
    const r = play(s, 0, "raise-dead");
    expect(r.state.players[0].board).toHaveLength(6);
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toEqual([expect.objectContaining({ seat: 0, defId: "skeleton", count: 1 })]);
  });
});

describe("returnToHand", () => {
  it("Destierro: leaves the board without dying (no Último Aliento) and goes to its owner's hand with a new iid", () => {
    const s = makeState({ p0: { hand: ["banish"] }, p1: { board: ["restless-skeleton"] } });
    const old = unitAt(s, 1, 0).iid;
    const r = play(s, 0, "banish", old);
    expect(r.state.players[1].board).toEqual([]);
    expect(handIds(r.state, 1)).toEqual(["restless-skeleton"]);
    const newIid = r.state.players[1].hand[0].iid;
    expect(newIid).not.toBe(old);
    expect(eventsOf(r.events, "MOB_RETURNED_TO_HAND")).toEqual([expect.objectContaining({ iid: old, seat: 1, newIid })]);
    expect(eventsOf(r.events, "MOB_DESTROYED")).toEqual([]);
    expect(r.state.players[1].graveyard).toEqual([]);
  });

  it("a full hand burns the card (revealed) but the unit still leaves", () => {
    const s = makeState({ p0: { hand: ["banish"] }, p1: { board: ["stone-golem"], hand: Array(10).fill("squire") } });
    const r = play(s, 0, "banish", unitAt(s, 1, 0).iid);
    expect(r.state.players[1].board).toEqual([]);
    expect(r.state.players[1].hand).toHaveLength(10);
    expect(eventTypes(r.events).filter((t) => t === "MOB_RETURNED_TO_HAND" || t === "CARD_BURNED")).toEqual(["MOB_RETURNED_TO_HAND", "CARD_BURNED"]);
    expect(eventsOf(r.events, "MOB_RETURNED_TO_HAND")[0].newIid).toBeNull();
    expect(eventsOf(r.events, "CARD_BURNED")).toEqual([expect.objectContaining({ seat: 1, defId: "stone-golem" })]);
  });

  it("a token goes to the hand and is playable (edge case); a borrowed unit returns to its OWNER", () => {
    const s = makeState({ p0: { hand: ["banish", "banish"], board: ["wolf", mob(1, 1)] } });
    unitAt(s, 0, 1).owner = 1; // e.g. taken with Dominación Mental
    let r = play(s, 0, "banish", unitAt(s, 0, 0).iid);
    const wolf = r.state.players[0].hand.find((c) => c.defId === "wolf")!;
    expect(getLegalActions(r.state, 0).play[wolf.iid]).toBeDefined();
    r = play(r.state, 0, "banish", unitAt(r.state, 0, 0).iid);
    expect(handIds(r.state, 1)).toEqual(["test-1-1"]);
    r = act(r.state, 0, { t: "play", card: wolf.iid });
    expect(defIds(r.state, 0)).toEqual(["wolf"]);
  });
});

describe("changeControl", () => {
  it("Dominación Mental: the unit moves to the right end of my board, sleeping, keeping damage and statuses", () => {
    const s = makeState({ p0: { hand: ["mind-thrall"], board: [mob(1, 1)] }, p1: { board: [{ defId: "stone-golem", damage: 2, statuses: [st("weakness", 1)] }] } });
    const iid = unitAt(s, 1, 0).iid;
    const r = play(s, 0, "mind-thrall", iid);
    expect(r.state.players[1].board).toEqual([]);
    const u = unitAt(r.state, 0, 1);
    expect(u).toMatchObject({ iid, controller: 0, owner: 1, damage: 2, summonedTurn: 1 });
    expect(u.statuses.map((x) => x.id)).toEqual(["weakness"]);
    expect(eventsOf(r.events, "CONTROL_CHANGED")).toEqual([expect.objectContaining({ iid, from: 1, to: 0, index: 1 })]);
    expect(() => attack(r.state, [0, 1], "h1")).toThrow("summoning_sick");
  });

  it("Carga may attack at once; a full board makes it a no-op", () => {
    const s = makeState({ p0: { hand: ["mind-thrall"] }, p1: { board: ["charging-rhino"] } });
    const r = play(s, 0, "mind-thrall", unitAt(s, 1, 0).iid);
    expect(attacksOf(r.state, 0, 0)).toEqual(["h1"]);

    const full = makeState({ p0: { hand: ["mind-thrall"], board: Array(6).fill("test-1-1") }, p1: { board: ["charging-rhino"] } });
    const r2 = play(full, 0, "mind-thrall", unitAt(full, 1, 0).iid);
    expect(eventsOf(r2.events, "CONTROL_CHANGED")).toEqual([]);
    expect(defIds(r2.state, 1)).toEqual(["charging-rhino"]);
  });

  it("Último Aliento of a taken unit uses its new controller (edge case)", () => {
    const s = makeState({ p0: { hand: ["mind-thrall", "arcane-spark"] }, p1: { board: ["restless-skeleton"] } });
    s.players[0].mana.temporary = 10;
    let r = play(s, 0, "mind-thrall", unitAt(s, 1, 0).iid);
    r = play(r.state, 0, "arcane-spark", unitAt(r.state, 0, 0).iid);
    expect(defIds(r.state, 0)).toEqual(["skeleton"]);
    expect(r.state.players[1].board).toEqual([]);
    expect(r.state.players[0].graveyard.map((g) => g.defId)).toEqual(["restless-skeleton"]);
  });
});

describe("copyToHand", () => {
  it("Eco Arcano: a copy of any unit's card in my hand (private event); the unit is untouched", () => {
    const s = makeState({ p0: { hand: ["arcane-echo"] }, p1: { board: ["alpha-wolf"] } });
    const r = play(s, 0, "arcane-echo", unitAt(s, 1, 0).iid);
    expect(handIds(r.state, 0)).toEqual(["alpha-wolf"]);
    expect(eventsOf(r.events, "CARD_ADDED_TO_HAND")).toEqual([expect.objectContaining({ seat: 0, defId: "alpha-wolf" })]);
    expect(defIds(r.state, 1)).toEqual(["alpha-wolf"]);
  });

  it("a full hand burns the copy", () => {
    const s = makeState({ p0: { board: ["squire"], hand: Array(10).fill("squire") } });
    const ctx = run(s, [{ type: "copyToHand", to: { kind: "all", group: "friendlyMobs" } }]);
    expect(eventsOf(ctx.events, "CARD_BURNED")).toEqual([expect.objectContaining({ seat: 0, defId: "squire" })]);
  });
});

describe("stealFromHand", () => {
  it("Ladrona de Almas: a random enemy card moves to my hand with a new iid; public CARD_STOLEN; deterministic", () => {
    const s = makeState({ p0: { hand: ["soul-thief"] }, p1: { hand: ["squire", "wolf-pup", "ignis"] } });
    const before = s.players[1].hand.map((c) => c.iid);
    const r = play(s, 0, "soul-thief");
    const [e] = eventsOf(r.events, "CARD_STOLEN");
    expect(e).toMatchObject({ from: 1, to: 0 });
    expect(before).toContain(e.fromIid);
    expect(r.state.players[1].hand.map((c) => c.iid)).toEqual(before.filter((x) => x !== e.fromIid));
    expect(r.state.players[0].hand).toEqual([{ iid: e.iid, defId: e.defId, costMod: 0 }]);
    expect(e.iid).not.toBe(e.fromIid);
    expect(play(s, 0, "soul-thief").state).toEqual(r.state);
  });

  it("an empty enemy hand is a no-op that uses no RNG (edge case)", () => {
    const s = makeState({ p0: { hand: ["soul-thief"] } });
    const r = play(s, 0, "soul-thief");
    expect(eventsOf(r.events, "CARD_STOLEN")).toEqual([]);
    expect(r.state.rng).toEqual(s.rng);
  });

  it("a full thief hand burns the stolen card (revealed)", () => {
    const s = makeState({ p0: { hand: Array(10).fill("squire") }, p1: { hand: ["ignis"] } });
    const ctx = run(s, [{ type: "stealFromHand", count: 2 }]);
    expect(s.players[1].hand).toEqual([]);
    expect(s.players[0].hand).toHaveLength(10);
    expect(eventsOf(ctx.events, "CARD_STOLEN")).toEqual([expect.objectContaining({ iid: null, defId: "ignis" })]);
    expect(eventsOf(ctx.events, "CARD_BURNED")).toEqual([expect.objectContaining({ seat: 0, defId: "ignis" })]);
  });
});

describe("modifyMana", () => {
  it("Sanguijuela de Maná: the enemy loses a crystal; current is clamped to the new max", () => {
    const s = makeState({ p0: { hand: ["mana-leech"] }, p1: { mana: 5 } });
    const r = play(s, 0, "mana-leech");
    expect(r.state.players[1].mana).toMatchObject({ current: 4, max: 4 });
    expect(eventsOf(r.events, "MANA_CHANGED").filter((e) => e.seat === 1)).toEqual([expect.objectContaining({ current: 4, max: 4 })]);
    const low = makeState({ p0: { hand: ["mana-leech"] }, p1: { mana: 2, maxMana: 5 } });
    expect(play(low, 0, "mana-leech").state.players[1].mana).toMatchObject({ current: 2, max: 4 });
  });

  it("clamps to 0..cap and emits nothing when nothing moved", () => {
    const s = makeState({ p0: { mana: 8 }, p1: { mana: 0 } });
    let ctx = run(s, [{ type: "modifyMana", side: "friendly", current: 5, max: 5 }]);
    expect(s.players[0].mana).toMatchObject({ current: 10, max: 10 });
    ctx = run(s, [{ type: "modifyMana", side: "enemy", current: -3, max: -2 }]);
    expect(s.players[1].mana).toMatchObject({ current: 0, max: 0 });
    expect(ctx.events).toEqual([]);
  });
});

// ── Every new card (Phase 19 I: "each new card's text") ──────────────────────────────────────────────

describe("Phase 19 cards", () => {
  const fresh = (p0: SideSpec, p1: SideSpec = {}) => makeState({ p0, p1 });

  it("venom-spider (Veneno), shadow-stalker (Sigilo), sun-cleric (Escudo Divino), ash-drake (Vuelo) carry their keyword", () => {
    const s = fresh({ board: ["venom-spider", "shadow-stalker", "sun-cleric", "ash-drake"] });
    expect(s.players[0].board.map((u) => u.keywords)).toEqual([{ poison: true }, { stealth: true }, { divineShield: true }, { flying: true }]);
  });

  it("storm-drake: Vuelo + stuns a random enemy mob", () => {
    const r = play(fresh({ hand: ["storm-drake"] }, { board: [mob(2, 2)] }), 0, "storm-drake");
    expect(unitAt(r.state, 1, 0).statuses.map((x) => x.id)).toEqual(["stun"]);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({ flying: true });
  });

  it("vaelra: freezes every enemy mob and deals 2 to the enemy hero", () => {
    const r = play(fresh({ hand: ["vaelra"] }, { board: [mob(2, 2), mob(3, 3)] }), 0, "vaelra");
    expect(r.state.players[1].board.map((u) => u.statuses.map((x) => x.id))).toEqual([["freeze"], ["freeze"]]);
    expect(r.state.players[1].hero.health).toBe(28);
  });

  it("clockwork-sentinel and iron-colossus: Provocar + Escudo (1) / (3)", () => {
    const s = fresh({ board: ["clockwork-sentinel", "iron-colossus"] }, { board: [mob(5, 5)] });
    expect(s.players[0].board.map((u) => [u.keywords.taunt, u.shieldCharges])).toEqual([[true, 1], [true, 3]]);
    s.turn.activeSeat = 1;
    expect(attacksOf(s, 1, 0)).toEqual([unitAt(s, 0, 0).iid, unitAt(s, 0, 1).iid]);
    const r = attack(s, [1, 0], [0, 0]);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ blocked: "shield" });
  });

  it("golem-forge: two 2/3 scrap-golem tokens with Provocar at the right end", () => {
    const r = play(fresh({ hand: ["golem-forge"], board: [mob(1, 1)] }), 0, "golem-forge");
    expect(defIds(r.state, 0)).toEqual(["test-1-1", "scrap-golem", "scrap-golem"]);
    expect(r.state.players[0].board.slice(1).map((u) => [getAttack(u), getHealth(u), u.keywords.taunt])).toEqual([[2, 3, true], [2, 3, true]]);
  });

  it("toad-hex works on my own units too (target: any mob)", () => {
    const s = fresh({ hand: ["toad-hex"], board: ["stone-golem"] });
    const r = play(s, 0, "toad-hex", unitAt(s, 0, 0).iid);
    expect(defIds(r.state, 0)).toEqual(["toad"]);
  });

  it("phoenix-chick: hits a random enemy when summoned, and again when Renacer brings it back (edge case)", () => {
    const s = fresh({ hand: ["phoenix-chick", "arcane-spark"] });
    let r = play(s, 0, "phoenix-chick");
    expect(r.state.players[1].hero.health).toBe(29);
    r = play(r.state, 0, "arcane-spark", unitAt(r.state, 0, 0).iid);
    expect(eventsOf(r.events, "MOB_SUMMONED")).toEqual([expect.objectContaining({ cause: "reborn" })]);
    expect(r.state.players[1].hero.health).toBe(28);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({});
  });

  it("dark-pact: destroys a friendly mob and draws two", () => {
    const s = fresh({ hand: ["dark-pact"], board: ["restless-skeleton"], deck: ["squire", "squire", "squire"] });
    const r = play(s, 0, "dark-pact", unitAt(s, 0, 0).iid);
    expect(defIds(r.state, 0)).toEqual(["skeleton"]); // its Último Aliento still fires: it died
    expect(handIds(r.state, 0)).toEqual(["squire", "squire"]);
    expect(getLegalActions(fresh({ hand: ["dark-pact"] }, { board: [mob(1, 1)] }), 0).play).toEqual({}); // needs a friendly mob
  });

  it("nyxara: silences every enemy mob, keeps its Sigilo, Robo de Vida (6) when attacking", () => {
    const s = fresh({ hand: ["nyxara"], health: 10 }, { board: ["shield-bearer", "swamp-ent"] });
    let r = play(s, 0, "nyxara");
    expect(r.state.players[1].board.every((u) => u.silenced && Object.keys(u.keywords).length === 0)).toBe(true);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({ stealth: true, lifesteal: 6 });
    r.state.players[0].board[0].summonedTurn = 0;
    r = attack(r.state, [0, 0], "h1");
    expect(r.state.players[0].hero.health).toBe(16);
    expect(unitAt(r.state, 0, 0).keywords).toEqual({ lifesteal: 6 });
  });
});
