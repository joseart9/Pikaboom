// Phase 18: statuses (§7.2–§7.4), Silencio, applyStatus/removeStatus, and the first status cards.
import { describe, expect, it } from "vitest";
import type { CardId, StatusId } from "../catalog/types";
import { act, eventsOf, eventTypes, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { newCtx } from "./ctx";
import { runEffects } from "./effects/execute";
import { getLegalActions } from "./legal";
import { getAttack, getHealth, getMaxHealth } from "./stats";
import { applyStatus, expiryFor, statusOf } from "./statuses";
import type { MatchState, Seat, StatusInstance } from "./types";

const st = (id: StatusId, magnitude = 0, expiresAfterTurn: number | null = 99, sourceId = "c99"): StatusInstance => ({
  id, magnitude, expiresAfterTurn, sourceId, appliedTurn: 1,
});
const mob = (attack: number, health: number, extra: Partial<UnitSpec> = {}): UnitSpec => ({ defId: "test-1-1", attack, health, ...extra });

function endTurn(s: MatchState): MatchState {
  return act(s, s.turn.activeSeat, { t: "endTurn" }).state;
}

/** Applies a status directly through the engine (as an effect would), mutating `s`. */
function give(s: MatchState, seat: Seat, index: number, id: StatusId, magnitude?: number, duration?: number | null) {
  const ctx = newCtx(s);
  const changed = applyStatus(ctx, unitAt(s, seat, index), id, magnitude, duration, "c99");
  return { changed, events: ctx.events };
}

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

const ids = (s: MatchState, seat: Seat, index: number) => unitAt(s, seat, index).statuses.map((x) => x.id);

describe("duration math (§7.3)", () => {
  it("applied on the owner's own turn: lasts through its NEXT turn; on the enemy's turn: through its next turn", () => {
    const s = makeState({ turn: 5, active: 0 });
    expect(expiryFor(s, 0, 1)).toBe(7); // own turn 5 → its next turn is 7
    expect(expiryFor(s, 1, 1)).toBe(6); // enemy turn → the owner's next turn is 6
    expect(expiryFor(s, 0, 2)).toBe(9);
    expect(expiryFor(s, 1, 2)).toBe(8);
    expect(expiryFor(s, 1, null)).toBeNull();
  });

  it("Congelado (1) applied on the enemy's turn makes the unit miss exactly its next turn", () => {
    let s = makeState({ p1: { board: [mob(2, 5)] } }); // turn 1, seat 0 active
    give(s, 1, 0, "freeze", undefined, 1);
    expect(statusOf(unitAt(s, 1, 0), "freeze")?.expiresAfterTurn).toBe(2);
    s = endTurn(s); // turn 2: seat 1
    expect(getLegalActions(s, 1).attacks[unitAt(s, 1, 0).iid]).toBeUndefined();
    expect(() => attack(s, [1, 0], "h0")).toThrow("cannot_attack");
    const r = act(s, 1, { t: "endTurn" });
    expect(eventsOf(r.events, "STATUS_REMOVED")).toEqual([expect.objectContaining({ iid: unitAt(s, 1, 0).iid, status: "freeze" })]);
    s = endTurn(r.state); // turn 4: seat 1 again
    expect(getLegalActions(s, 1).attacks[unitAt(s, 1, 0).iid]).toBeDefined();
  });

  it("edge: Congelado applied during its own turn to a unit that already attacked still misses its next turn", () => {
    let s = makeState({ p0: { board: [mob(2, 5, { attacksThisTurn: 1 })] } });
    give(s, 0, 0, "freeze", undefined, 1);
    expect(statusOf(unitAt(s, 0, 0), "freeze")?.expiresAfterTurn).toBe(3);
    s = endTurn(endTurn(s)); // turn 3: seat 0
    expect(ids(s, 0, 0)).toEqual(["freeze"]);
    expect(() => attack(s, [0, 0], "h1")).toThrow("cannot_attack");
    s = endTurn(s);
    expect(ids(s, 0, 0)).toEqual([]);
    s = endTurn(s); // turn 5
    expect(() => attack(s, [0, 0], "h1")).not.toThrow();
  });

  it("only the active seat's statuses expire at its end of turn; permanent statuses never expire", () => {
    let s = makeState({ p0: { board: [mob(1, 9, { statuses: [st("weakness", 1, 1), st("curse", 0, null)] })] }, p1: { board: [mob(1, 9, { statuses: [st("weakness", 1, 1)] })] } });
    s = endTurn(s); // end of turn 1 (seat 0)
    expect(ids(s, 0, 0)).toEqual(["curse"]);
    expect(ids(s, 1, 0)).toEqual(["weakness"]); // seat 1's units expire at the end of seat 1's turn
    for (let i = 0; i < 6; i++) s = endTurn(s);
    expect(ids(s, 0, 0)).toEqual(["curse"]);
    expect(ids(s, 1, 0)).toEqual([]);
  });
});

describe("stacking (§7.4)", () => {
  it("add: magnitudes sum and the later expiry wins (Debilidad)", () => {
    const s = makeState({ p1: { board: [mob(5, 5)] } });
    give(s, 1, 0, "weakness", 2, 1);
    const r = give(s, 1, 0, "weakness", 1, 2);
    expect(statusOf(unitAt(s, 1, 0), "weakness")).toMatchObject({ magnitude: 3, expiresAfterTurn: 4 });
    expect(unitAt(s, 1, 0).statuses).toHaveLength(1);
    expect(eventsOf(r.events, "STATUS_APPLIED")).toEqual([expect.objectContaining({ status: "weakness", magnitude: 3 })]);
    expect(getAttack(unitAt(s, 1, 0))).toBe(2);
  });

  it("max: the larger magnitude stays (Quemadura 1 → 2 → 1 stays 2), expiry extends", () => {
    const s = makeState({ p1: { board: [mob(5, 5)] } });
    give(s, 1, 0, "burn", 1, 1);
    give(s, 1, 0, "burn", 2, 1);
    give(s, 1, 0, "burn", 1, 3);
    expect(statusOf(unitAt(s, 1, 0), "burn")).toMatchObject({ magnitude: 2, expiresAfterTurn: 6 });
  });

  it("refresh: magnitude-less status keeps one instance, takes the later expiry (never shortens)", () => {
    const s = makeState({ p1: { board: [mob(5, 5)] } });
    give(s, 1, 0, "freeze", undefined, 2);
    give(s, 1, 0, "freeze", undefined, 1);
    expect(unitAt(s, 1, 0).statuses).toEqual([expect.objectContaining({ id: "freeze", magnitude: 0, expiresAfterTurn: 4 })]);
  });

  it("ignore: a second Maldición does nothing (no event)", () => {
    const s = makeState({ p1: { board: [mob(5, 5)] } });
    expect(give(s, 1, 0, "curse").changed).toBe(true);
    const again = give(s, 1, 0, "curse");
    expect(again.changed).toBe(false);
    expect(again.events).toEqual([]);
    expect(statusOf(unitAt(s, 1, 0), "curse")?.expiresAfterTurn).toBeNull(); // default: permanent
  });

  it("defaults come from STATUS_DEFS when the effect gives no duration/magnitude", () => {
    const s = makeState({ p1: { board: [mob(5, 5)] } });
    give(s, 1, 0, "burn");
    expect(statusOf(unitAt(s, 1, 0), "burn")).toMatchObject({ magnitude: 1, expiresAfterTurn: 4 }); // duration 2
  });
});

describe("status behavior (§7.2)", () => {
  it("Quemadura: effect damage at the start of its controller's turn only, from the applier, for its duration", () => {
    let s = makeState({ p0: { board: [mob(1, 1)] }, p1: { board: [mob(1, 9, { statuses: [st("burn", 2, 4, "c1")] })] } });
    let r = act(s, 0, { t: "endTurn" }); // turn 2 starts: seat 1 burns
    const burn = eventsOf(r.events, "DAMAGE").find((e) => e.target === unitAt(s, 1, 0).iid);
    expect(burn).toMatchObject({ source: "c1", amount: 2, dealt: 2, kind: "effect" });
    expect(eventTypes(r.events).indexOf("TURN_STARTED")).toBeLessThan(r.events.indexOf(burn!));
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(7);
    expect(unitAt(r.state, 1, 0).lastDamagedBy).toBe("c1");
    s = endTurn(r.state); // turn 3: seat 0's turn — no tick for seat 1's unit
    expect(getHealth(unitAt(s, 1, 0))).toBe(7);
    r = act(s, 0, { t: "endTurn" }); // turn 4: second tick, then expiry at its end
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(5);
    s = endTurn(endTurn(r.state)); // turn 6
    expect(getHealth(unitAt(s, 1, 0))).toBe(5);
    expect(ids(s, 1, 0)).toEqual([]);
  });

  it("edge: Quemadura kills at turn start before the draw; its Último Aliento resolves before the draw", () => {
    const s = makeState({ p1: { board: [{ defId: "restless-skeleton", statuses: [st("burn", 1, 4)] }], deck: ["squire"] } });
    const r = act(s, 0, { t: "endTurn" });
    const types = eventTypes(r.events);
    const destroyed = types.indexOf("MOB_DESTROYED");
    expect(destroyed).toBeGreaterThan(-1);
    expect(types.indexOf("MOB_SUMMONED")).toBeGreaterThan(destroyed);
    expect(types.indexOf("MOB_SUMMONED")).toBeLessThan(types.indexOf("CARD_DRAWN"));
    expect(r.state.players[1].board.map((u) => u.defId)).toEqual(["skeleton"]);
  });

  it("Congelado and Aturdido cannot attack; Desarmado can", () => {
    for (const [id, can] of [["freeze", false], ["stun", false], ["disarm", true]] as const) {
      const s = makeState({ p0: { board: [mob(3, 3, { statuses: [st(id)] })] } });
      expect(getLegalActions(s, 0).attacks[unitAt(s, 0, 0).iid] !== undefined, id).toBe(can);
    }
  });

  it("Aturdido: deals no retaliation damage, but its Espinas still hurt", () => {
    const s = makeState({ p0: { board: [mob(2, 5)] }, p1: { board: [mob(4, 5, { statuses: [st("stun")], keywords: { thorns: 1 } })] } });
    const r = attack(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(4); // thorns 1, no retaliation
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(3);
  });

  it("Aturdido: its triggered abilities do not fire; queued ones fizzle; Último Aliento still does", () => {
    // Lobo Alfa (stunned) ignores a friendly Bestia summon.
    let s = makeState({ p0: { board: [{ defId: "alpha-wolf", statuses: [st("stun")] }], hand: ["wolf-pup"] } });
    s = play(s, 0, "wolf-pup").state;
    expect(getAttack(unitAt(s, 0, 1))).toBe(1);
    // Esqueleto Inquieto (stunned) still summons when it dies.
    s = makeState({ p0: { hand: ["arcane-spark"] }, p1: { board: [{ defId: "restless-skeleton", statuses: [st("stun")] }] } });
    const r = play(s, 0, "arcane-spark", unitAt(s, 1, 0).iid);
    expect(r.state.players[1].board.map((u) => u.defId)).toEqual(["skeleton"]);
  });

  it("edge: Aturdido on a Provocar unit — it still taunts", () => {
    const s = makeState({ p0: { board: [mob(2, 5)] }, p1: { board: [{ defId: "shield-bearer", statuses: [st("stun")] }, mob(1, 1)] } });
    expect(getLegalActions(s, 0).attacks[unitAt(s, 0, 0).iid]).toEqual([unitAt(s, 1, 0).iid]);
  });

  it("Desarmado: attacks for 0 and retaliates for 0 (no DAMAGE events, no lifesteal)", () => {
    let s = makeState({ p0: { board: [mob(3, 3, { statuses: [st("disarm")], keywords: { lifesteal: 2 } })], health: 20 }, p1: { board: [mob(3, 3)] } });
    let r = attack(s, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "DAMAGE").filter((e) => e.source === unitAt(s, 0, 0).iid)).toEqual([]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(3);
    expect(r.state.players[0].board).toHaveLength(0);
    expect(r.state.players[0].hero.health).toBe(20);
    s = makeState({ p0: { board: [mob(3, 9)] }, p1: { board: [mob(5, 5, { statuses: [st("disarm")] })] } });
    r = attack(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(9);
  });

  it("Debilidad: −N attack, never below 0; STATS_CHANGED on apply and expiry", () => {
    const s = makeState({ p1: { board: [mob(2, 5)] } });
    const r = give(s, 1, 0, "weakness", 3, 1);
    expect(getAttack(unitAt(s, 1, 0))).toBe(0);
    expect(eventsOf(r.events, "STATS_CHANGED")).toEqual([expect.objectContaining({ attack: 0, health: 5, maxHealth: 5 })]);
    const end = act(endTurn(s), 1, { t: "endTurn" });
    expect(getAttack(unitAt(end.state, 1, 0))).toBe(2);
    expect(eventsOf(end.events, "STATS_CHANGED").some((e) => e.iid === unitAt(s, 1, 0).iid && e.attack === 2)).toBe(true);
  });

  it("Vulnerabilidad: +N to every damage instance it receives", () => {
    const s = makeState({ p0: { hand: ["arcane-spark"], board: [mob(1, 9)] }, p1: { board: [mob(0, 9, { statuses: [st("vulnerability", 2)] })] } });
    let r = play(s, 0, "arcane-spark", unitAt(s, 1, 0).iid);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ amount: 4, dealt: 4 });
    r = attack(r.state, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(9 - 4 - 3);
  });

  it("edge: Vulnerabilidad on an Escudo unit — the combat hit is still fully blocked; effects still get +N", () => {
    let s = makeState({ p0: { board: [mob(2, 9)], hand: ["arcane-spark"] }, p1: { board: [{ defId: "iron-guard", statuses: [st("vulnerability", 2)] }] } });
    let r = attack(s, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "DAMAGE").find((e) => e.target === unitAt(s, 1, 0).iid)).toMatchObject({ dealt: 0, blocked: "shield" });
    s = r.state;
    r = play(s, 0, "arcane-spark", unitAt(s, 1, 0).iid);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ amount: 4, dealt: 4, blocked: null }); // 2 + 2
    expect(r.state.players[1].board).toEqual([]); // Guardia de Hierro has 4 health
  });

  it("Maldición: healing does nothing (no HEAL event)", () => {
    const s = makeState({ p0: { hand: ["healing-touch"], board: [mob(1, 9, { damage: 5, statuses: [st("curse", 0, null)] })] } });
    const r = play(s, 0, "healing-touch", unitAt(s, 0, 0).iid);
    expect(eventsOf(r.events, "HEAL")).toEqual([]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(4);
  });

  it("edge: Maldición + Regeneración → no heal at end of turn", () => {
    const s = makeState({ p0: { board: [{ defId: "swamp-ent", damage: 3, statuses: [st("curse", 0, null)] }] } });
    expect(getHealth(unitAt(act(s, 0, { t: "endTurn" }).state, 0, 0))).toBe(2);
  });

  it("Bendición: +N/+N; on expiry health follows the buff-removal rule (never dies from it)", () => {
    let s = makeState({ p0: { board: [mob(2, 3)] } });
    give(s, 0, 0, "blessing", 2, 1); // expires after turn 3
    expect([getAttack(unitAt(s, 0, 0)), getHealth(unitAt(s, 0, 0)), getMaxHealth(unitAt(s, 0, 0))]).toEqual([4, 5, 5]);
    unitAt(s, 0, 0).damage = 4; // 1/5
    s = endTurn(endTurn(s));
    const r = act(s, 0, { t: "endTurn" });
    const u = unitAt(r.state, 0, 0);
    expect([getAttack(u), getHealth(u), getMaxHealth(u)]).toEqual([2, 1, 3]);
    // Damaged only a little: current health is capped at the new max (5 → 3), not reduced by 2.
    s = makeState({ p0: { board: [mob(2, 3)] } });
    give(s, 0, 0, "blessing", 2, 1);
    unitAt(s, 0, 0).damage = 1; // 4/5
    const r2 = act(endTurn(endTurn(s)), 0, { t: "endTurn" });
    expect([getHealth(unitAt(r2.state, 0, 0)), getMaxHealth(unitAt(r2.state, 0, 0))]).toEqual([3, 3]);
  });

  it("Sangrado: after attacking (combat damage first), the attacker takes N effect damage from the applier", () => {
    const s = makeState({ p0: { board: [mob(2, 5, { statuses: [st("bleed", 2, 99, "c77")] })] }, p1: { board: [mob(1, 9)] } });
    const r = attack(s, [0, 0], [1, 0]);
    const damage = eventsOf(r.events, "DAMAGE");
    expect(damage.map((e) => [e.source, e.kind, e.dealt])).toEqual([
      [unitAt(s, 0, 0).iid, "combat", 2],
      [unitAt(s, 1, 0).iid, "combat", 1],
      ["c77", "effect", 2],
    ]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(2);
    // Defending does not bleed.
    const d = attack(makeState({ p0: { board: [mob(1, 9)] }, p1: { board: [mob(1, 5, { statuses: [st("bleed", 2)] })] } }), [0, 0], [1, 0]);
    expect(getHealth(unitAt(d.state, 1, 0))).toBe(4);
  });

  it("Inmune: prevents all damage (combat and effect) without using Escudo charges", () => {
    const s = makeState({
      p0: { board: [mob(5, 9)], hand: ["arcane-spark"] },
      p1: { board: [mob(3, 3, { statuses: [st("immune")], keywords: { shield: 1 }, shieldCharges: 1 })] },
    });
    const target = unitAt(s, 1, 0).iid;
    let r = attack(s, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "DAMAGE").find((e) => e.target === target)).toMatchObject({ dealt: 0, blocked: "immune" });
    expect(unitAt(r.state, 1, 0).shieldCharges).toBe(1);
    r = play(r.state, 0, "arcane-spark", target);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ kind: "effect", dealt: 0, blocked: "immune" });
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(3);
  });

  it("statuses on heroes are a no-op (hero-capable selectors)", () => {
    const s = makeState({ p1: { board: [mob(1, 1)] } });
    s.defs["test-status-all"] = {
      id: "test-status-all", version: 1, type: "spell", set: "core", cost: 0, rarity: "common", collectible: false, art: "x",
      abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "applyStatus", to: { kind: "all", group: "enemyCharacters" }, status: "burn", magnitude: 1 }] }],
    };
    s.players[0].hand.push({ iid: "c50", defId: "test-status-all", costMod: 0 });
    const r = act(s, 0, { t: "play", card: "c50" });
    expect(eventsOf(r.events, "STATUS_APPLIED").map((e) => e.iid)).toEqual([unitAt(s, 1, 0).iid]);
  });

  it("hasStatus filter selects only units with that status", () => {
    const s = makeState({ p1: { board: [mob(1, 5, { statuses: [st("freeze")] }), mob(1, 5)] } });
    s.defs["test-shatter-frozen"] = {
      id: "test-shatter-frozen", version: 1, type: "spell", set: "core", cost: 0, rarity: "common", collectible: false, art: "x",
      abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "damage", amount: 3, to: { kind: "all", group: "enemyMobs", filter: { hasStatus: "freeze" } } }] }],
    };
    s.players[0].hand.push({ iid: "c50", defId: "test-shatter-frozen", costMod: 0 });
    const r = act(s, 0, { t: "play", card: "c50" });
    expect(r.state.players[1].board.map(getHealth)).toEqual([2, 5]);
  });
});

describe("Silencio & removeStatus", () => {
  it("silence clears keywords, Escudo charges, modifiers and every status; damage stays; triggers stop", () => {
    const s = makeState({
      p0: { hand: ["silence-monk"] },
      p1: {
        board: [{
          defId: "restless-skeleton", health: 4, damage: 1, keywords: { taunt: true, shield: 2 }, shieldCharges: 2,
          modifiers: [{ attack: 2, health: 0, expires: "never", sourceId: "c9" }],
          statuses: [st("burn", 2), st("weakness", 1)],
        }],
      },
    });
    const target = unitAt(s, 1, 0).iid;
    const r = play(s, 0, "silence-monk", target);
    const u = unitAt(r.state, 1, 0);
    expect(u).toMatchObject({ silenced: true, keywords: {}, shieldCharges: 0, modifiers: [], statuses: [], damage: 1 });
    expect([getAttack(u), getHealth(u)]).toEqual([2, 3]);
    const types = eventTypes(r.events);
    expect(types.indexOf("MOB_SILENCED")).toBeLessThan(types.lastIndexOf("STATS_CHANGED"));
    expect(eventsOf(r.events, "STATS_CHANGED").at(-1)).toMatchObject({ iid: target, attack: 2, health: 3, maxHealth: 4 });
    // Its Último Aliento no longer fires.
    const s2 = r.state;
    s2.players[0].hand.push({ iid: "c80", defId: "flame-lance", costMod: 0 });
    const killed = act(s2, 0, { t: "play", card: "c80", target });
    expect(killed.state.players[1].board).toEqual([]);
  });

  it("edge: Silencio removes Bendición — health clamps to the new max and the unit survives", () => {
    const s = makeState({ p0: { hand: ["silence-monk"] }, p1: { board: [mob(2, 3, { statuses: [st("blessing", 2)], damage: 4 })] } });
    expect(getHealth(unitAt(s, 1, 0))).toBe(1);
    const r = play(s, 0, "silence-monk", unitAt(s, 1, 0).iid);
    const u = unitAt(r.state, 1, 0);
    expect([getAttack(u), getHealth(u), getMaxHealth(u)]).toEqual([2, 1, 3]);
  });

  it("a silenced unit can receive new statuses but not keywords", () => {
    const s = makeState({ p1: { board: [mob(2, 3)] } });
    unitAt(s, 1, 0).silenced = true;
    expect(give(s, 1, 0, "freeze").changed).toBe(true);
    const ctx = newCtx(s);
    runEffects(ctx, [{ type: "grantKeyword", to: { kind: "all", group: "enemyMobs" }, keyword: "taunt" }], {
      controller: 0, sourceId: "c99", sourceDefId: "test-1-1", depth: 0,
    });
    expect(ctx.events).toEqual([]);
    expect(unitAt(s, 1, 0).keywords).toEqual({});
  });

  it("removeStatus: one id, allNegative (keeps Bendición/Inmune), all", () => {
    const base = () => makeState({ p1: { board: [mob(2, 5, { statuses: [st("burn", 1), st("blessing", 1), st("curse", 0, null), st("immune")] })] } });
    const run = (status: StatusId | "allNegative" | "all") => {
      const s = base();
      s.defs["test-rm"] = {
        id: "test-rm", version: 1, type: "spell", set: "core", cost: 0, rarity: "common", collectible: false, art: "x",
        abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "removeStatus", to: { kind: "all", group: "enemyMobs" }, status }] }],
      };
      s.players[0].hand.push({ iid: "c50", defId: "test-rm", costMod: 0 });
      const r = act(s, 0, { t: "play", card: "c50" });
      return { left: ids(r.state, 1, 0), removed: eventsOf(r.events, "STATUS_REMOVED").map((e) => e.status) };
    };
    expect(run("burn")).toEqual({ left: ["blessing", "curse", "immune"], removed: ["burn"] });
    expect(run("allNegative")).toEqual({ left: ["blessing", "immune"], removed: ["burn", "curse"] });
    expect(run("all")).toEqual({ left: [], removed: ["burn", "blessing", "curse", "immune"] });
  });
});

describe("Phase 18 cards", () => {
  it("ember-imp: Grito de Guerra — Quemadura (1) on an enemy mob for 2 of its turns", () => {
    let s = makeState({ p0: { hand: ["ember-imp"] }, p1: { board: [mob(1, 9)] } });
    s = play(s, 0, "ember-imp", unitAt(s, 1, 0).iid).state;
    expect(statusOf(unitAt(s, 1, 0), "burn")).toMatchObject({ magnitude: 1, expiresAfterTurn: 4, sourceId: unitAt(s, 0, 0).iid });
    for (let i = 0; i < 6; i++) s = endTurn(s);
    expect(getHealth(unitAt(s, 1, 0))).toBe(7); // ticks on turns 2 and 4
  });

  it("ice-shard: 1 damage and Congelado; a target killed by the damage is not frozen", () => {
    let s = makeState({ p0: { hand: ["ice-shard", "ice-shard"] }, p1: { board: [mob(2, 3), mob(2, 1)] } });
    const r = play(s, 0, "ice-shard", unitAt(s, 1, 0).iid);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(2);
    expect(ids(r.state, 1, 0)).toEqual(["freeze"]);
    s = r.state;
    const r2 = play(s, 0, "ice-shard", unitAt(s, 1, 1).iid);
    expect(eventsOf(r2.events, "STATUS_APPLIED")).toEqual([]);
  });

  it("frozen-gale: 1 damage to every enemy mob, then freezes the survivors", () => {
    const s = makeState({ p0: { hand: ["frozen-gale"] }, p1: { board: [mob(2, 3), mob(2, 1), mob(2, 4)] } });
    const r = play(s, 0, "frozen-gale");
    expect(r.state.players[1].board.map((u) => [getHealth(u), u.statuses.map((x) => x.id).join()])).toEqual([[2, "freeze"], [3, "freeze"]]);
    expect(Object.keys(getLegalActions(endTurn(r.state), 1).attacks)).toEqual([]);
  });

  it("flame-wyrm: Quemadura (2) on a random enemy mob; nothing when there is none", () => {
    let s = makeState({ p0: { hand: ["flame-wyrm"] }, p1: { board: [mob(1, 9)] } });
    s = play(s, 0, "flame-wyrm").state;
    expect(statusOf(unitAt(s, 1, 0), "burn")?.magnitude).toBe(2);
    const empty = play(makeState({ p0: { hand: ["flame-wyrm"] } }), 0, "flame-wyrm");
    expect(eventsOf(empty.events, "STATUS_APPLIED")).toEqual([]);
  });

  it("blood-hound: after dealing combat damage to an enemy mob it applies Sangrado (1); heroes are unaffected", () => {
    let s = makeState({ p0: { board: ["blood-hound", "blood-hound"] }, p1: { board: [mob(1, 9)] } });
    s = attack(s, [0, 0], [1, 0]).state;
    expect(statusOf(unitAt(s, 1, 0), "bleed")).toMatchObject({ magnitude: 1, sourceId: unitAt(s, 0, 0).iid });
    const hero = attack(s, [0, 1], "h1");
    expect(eventsOf(hero.events, "STATUS_APPLIED")).toEqual([]);
    s = endTurn(hero.state);
    const r = attack(s, [1, 0], [0, 0]); // the bleeding unit attacks: 1 bleed damage afterwards
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(9 - 3 - 3 - 1);
  });

  it("curse-weaver: Maldición + Debilidad (2) on an enemy mob", () => {
    const s = makeState({ p0: { hand: ["curse-weaver"] }, p1: { board: [mob(5, 5)] } });
    const r = play(s, 0, "curse-weaver", unitAt(s, 1, 0).iid);
    const u = unitAt(r.state, 1, 0);
    expect(u.statuses.map((x) => [x.id, x.magnitude, x.expiresAfterTurn])).toEqual([["curse", 0, null], ["weakness", 2, 4]]);
    expect(getAttack(u)).toBe(3);
  });

  it("blessing-of-light: Bendición (2) on a friendly mob for 2 of its turns", () => {
    let s = makeState({ p0: { hand: ["blessing-of-light"], board: [mob(1, 1)] } });
    s = play(s, 0, "blessing-of-light", unitAt(s, 0, 0).iid).state;
    expect([getAttack(unitAt(s, 0, 0)), getHealth(unitAt(s, 0, 0))]).toEqual([3, 3]);
    expect(statusOf(unitAt(s, 0, 0), "blessing")?.expiresAfterTurn).toBe(5);
    for (let i = 0; i < 4; i++) s = endTurn(s);
    expect(getAttack(unitAt(s, 0, 0))).toBe(3); // turn 5, still blessed
    s = endTurn(s);
    expect([getAttack(unitAt(s, 0, 0)), getHealth(unitAt(s, 0, 0))]).toEqual([1, 1]);
  });

  it("purify: removes negative statuses (Maldición first, so the heal works), keeps positive ones, heals 2", () => {
    const s = makeState({ p0: { hand: ["purify"], board: [mob(1, 9, { damage: 5, statuses: [st("curse", 0, null), st("weakness", 1), st("blessing", 1)] })] } });
    const r = play(s, 0, "purify", unitAt(s, 0, 0).iid);
    expect(ids(r.state, 0, 0)).toEqual(["blessing"]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(5 + 2);
  });

  it("silence-monk: Grito de Guerra — silences any mob, friendly or enemy (not itself)", () => {
    const s = makeState({ p0: { hand: ["silence-monk"], board: ["iron-guard"] }, p1: { board: ["shield-bearer"] } });
    const targets = Object.values(getLegalActions(s, 0).play)[0].targets;
    expect(targets).toEqual([unitAt(s, 0, 0).iid, unitAt(s, 1, 0).iid]);
    const r = play(s, 0, "silence-monk", unitAt(s, 1, 0).iid);
    expect(unitAt(r.state, 1, 0).silenced).toBe(true);
    expect(eventsOf(r.events, "MOB_SILENCED")).toHaveLength(1);
  });

  it("shatter-armor: Vulnerabilidad (2) on an enemy mob", () => {
    const s = makeState({ p0: { hand: ["shatter-armor"], board: [mob(1, 9)] }, p1: { board: [mob(0, 9)] } });
    let r = play(s, 0, "shatter-armor", unitAt(s, 1, 0).iid);
    r = attack(r.state, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(6);
  });

  it("disarming-strike: 1 damage and Desarmado through its next turn", () => {
    let s = makeState({ p0: { hand: ["disarming-strike"] }, p1: { board: [mob(4, 5)] } });
    s = play(s, 0, "disarming-strike", unitAt(s, 1, 0).iid).state;
    expect(getHealth(unitAt(s, 1, 0))).toBe(4);
    s = endTurn(s);
    const r = attack(s, [1, 0], "h0");
    expect(r.state.players[0].hero.health).toBe(s.players[0].hero.health);
    expect(ids(endTurn(r.state), 1, 0)).toEqual([]);
  });

  it("stone-sleep: Aturdido — the target misses its next turn and does not retaliate", () => {
    let s = makeState({ p0: { hand: ["stone-sleep"], board: [mob(2, 5)] }, p1: { board: [mob(4, 5)] } });
    s = play(s, 0, "stone-sleep", unitAt(s, 1, 0).iid).state;
    const r = attack(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(5);
    s = endTurn(r.state);
    expect(getLegalActions(s, 1).attacks).toEqual({});
  });

  it("aegis-ward: a friendly mob is Inmune until the end of your next turn", () => {
    let s = makeState({ p0: { hand: ["aegis-ward"], board: [mob(1, 2)] }, p1: { board: [mob(5, 5)] } });
    s = play(s, 0, "aegis-ward", unitAt(s, 0, 0).iid).state;
    expect(statusOf(unitAt(s, 0, 0), "immune")?.expiresAfterTurn).toBe(3);
    s = endTurn(s);
    s = attack(s, [1, 0], [0, 0]).state; // turn 2: blocked
    expect(getHealth(unitAt(s, 0, 0))).toBe(2);
    s = endTurn(endTurn(s)); // end of turn 3 removes it
    expect(ids(s, 0, 0)).toEqual([]);
  });
});
