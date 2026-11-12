import { describe, expect, it } from "vitest";
import { act, eventsOf, eventTypes, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { newCtx } from "./ctx";
import { applyDamageInstances, heal } from "./damage";
import { hasKeyword, keywordValue, maxAttacks } from "./keywords";
import { getAttack, getHealth, isSleeping } from "./stats";
import type { MatchState, Seat } from "./types";

function mob(attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec {
  return { defId: "test-1-1", attack, health, ...extra };
}

function atk(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

/** Ends seat 0's turn and seat 1's turn (back to seat 0, attacks reset). */
function nextOwnTurn(s: MatchState): MatchState {
  s = act(s, 0, { t: "endTurn" }).state;
  return act(s, 1, { t: "endTurn" }).state;
}

describe("keyword helpers", () => {
  it("silenced units have no keywords", () => {
    const s = makeState({ p0: { board: [mob(1, 1, { keywords: { taunt: true, lifesteal: 2, doubleStrike: true } })] } });
    const u = unitAt(s, 0, 0);
    expect(hasKeyword(u, "taunt")).toBe(true);
    expect(keywordValue(u, "lifesteal")).toBe(2);
    expect(maxAttacks(u)).toBe(2);
    u.silenced = true;
    expect(hasKeyword(u, "taunt")).toBe(false);
    expect(keywordValue(u, "lifesteal")).toBeUndefined();
    expect(maxAttacks(u)).toBe(1);
  });

  it("isSleeping respects Carga/Embestida", () => {
    const s = makeState({ p0: { board: [mob(1, 1, { sleeping: true }), mob(1, 1, { sleeping: true, keywords: { rush: true } }), mob(1, 1)] } });
    expect(s.players[0].board.map((u) => isSleeping(s, u))).toEqual([true, false, false]);
  });
});

describe("Escudo (shield, ADR-21)", () => {
  it("row 9: Escudo 3 blocks three attacks (charges 2, 1, 0); the 4th deals 4", () => {
    let s = makeState({ p0: { board: [mob(4, 4)] }, p1: { board: [mob(1, 5, { keywords: { shield: 3 } })] } });
    for (const charges of [2, 1, 0]) {
      const r = atk(s, [0, 0], [1, 0]);
      s = r.state;
      expect(getHealth(unitAt(s, 1, 0))).toBe(5);
      expect(unitAt(s, 1, 0).shieldCharges).toBe(charges);
      expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ amount: 4, dealt: 0, blocked: "shield", healthAfter: 5 });
      expect(eventsOf(r.events, "KEYWORDS_CHANGED")).toMatchObject([{ iid: unitAt(s, 1, 0).iid, shieldCharges: charges }]);
      s = nextOwnTurn(s);
    }
    expect(unitAt(s, 1, 0).keywords.shield).toBeUndefined(); // DEC-011: keyword gone with the last charge
    const r = atk(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(1);
    expect(eventsOf(r.events, "KEYWORDS_CHANGED")).toEqual([]);
  });

  it("row 10: 2/3 attacks Escudo(1) 3/3 — defender undamaged, attacker dies", () => {
    const s = makeState({ p0: { board: [mob(2, 3)] }, p1: { board: [mob(3, 3, { keywords: { shield: 1 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toHaveLength(0);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(3);
    expect(unitAt(r.state, 1, 0).shieldCharges).toBe(0);
  });

  it("Escudo(1) target of Barrido: main hit blocked, neighbours damaged", () => {
    const s = makeState({ p0: { board: [mob(3, 9, { keywords: { cleave: true } })] }, p1: { board: [mob(1, 5), mob(1, 5, { keywords: { shield: 1 } }), mob(1, 5)] } });
    const r = atk(s, [0, 0], [1, 1]);
    expect(r.state.players[1].board.map(getHealth)).toEqual([2, 5, 2]);
  });

  it("zero-damage hits do not consume charges", () => {
    const s = makeState({ p0: { board: [mob(2, 5)] }, p1: { board: [mob(0, 5, { keywords: { shield: 1 } })] } });
    s.players[0].board[0].keywords = { shield: 1 };
    s.players[0].board[0].shieldCharges = 1;
    const r = atk(s, [0, 0], [1, 0]); // the defender retaliates for 0: no instance against the attacker
    expect(unitAt(r.state, 0, 0).shieldCharges).toBe(1);
  });

  it("effect damage pierces Escudo; combat damage does not", () => {
    const s = makeState({ p1: { board: [mob(1, 5, { keywords: { shield: 2 } })] } });
    const ctx = newCtx(s);
    const target = unitAt(s, 1, 0).iid;
    const results = applyDamageInstances(ctx, [
      { source: "h0", target, amount: 2, kind: "effect" },
      { source: "h0", target, amount: 2, kind: "combat" },
      { source: "h0", target, amount: 0, kind: "combat" }, // dropped
    ]);
    expect(results.map((x) => [x.dealt, x.blocked, x.healthAfter])).toEqual([[2, null, 3], [0, "shield", 3]]);
    expect(unitAt(s, 1, 0).shieldCharges).toBe(1);
    expect(eventTypes(ctx.events)).toEqual(["DAMAGE", "DAMAGE", "KEYWORDS_CHANGED"]);
  });

  it("charges are consumed in list order within one batch", () => {
    const s = makeState({ p1: { board: [mob(1, 9, { keywords: { shield: 1 } })] } });
    const target = unitAt(s, 1, 0).iid;
    const results = applyDamageInstances(newCtx(s), [
      { source: "h0", target, amount: 3, kind: "combat" },
      { source: "h0", target, amount: 4, kind: "combat" },
    ]);
    expect(results.map((x) => x.blocked)).toEqual(["shield", null]);
    expect(getHealth(unitAt(s, 1, 0))).toBe(5);
  });

  it("a silenced unit's charges do not block", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: { shield: 2 } })] } });
    s.players[1].board[0].silenced = true;
    expect(getHealth(unitAt(atk(s, [0, 0], [1, 0]).state, 1, 0))).toBe(2);
  });
});

describe("Robo de Vida (lifesteal)", () => {
  it("row 11: Robo de Vida 2 attacker deals damage → hero 20 → 22", () => {
    const s = makeState({ p0: { health: 20, board: [mob(2, 5, { keywords: { lifesteal: 2 } })] }, p1: { board: [mob(1, 5)] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].hero.health).toBe(22);
    expect(eventsOf(r.events, "HEAL")).toMatchObject([{ source: unitAt(s, 0, 0).iid, target: "h0", amount: 2, healthAfter: 22 }]);
  });

  it("row 12: Robo de Vida blocked by Escudo → no heal", () => {
    const s = makeState({ p0: { health: 20, board: [mob(2, 5, { keywords: { lifesteal: 2 } })] }, p1: { board: [mob(1, 5, { keywords: { shield: 1 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].hero.health).toBe(20);
    expect(eventsOf(r.events, "HEAL")).toEqual([]);
  });

  it("heals once even when Barrido hits several units; the blocked main hit still counts if a splash lands", () => {
    const s = makeState({
      p0: { health: 20, board: [mob(2, 9, { keywords: { lifesteal: 3, cleave: true } })] },
      p1: { board: [mob(1, 5), mob(1, 5, { keywords: { shield: 1 } }), mob(1, 5)] },
    });
    const r = atk(s, [0, 0], [1, 1]);
    expect(eventsOf(r.events, "HEAL")).toHaveLength(1);
    expect(r.state.players[0].hero.health).toBe(23);
  });

  it("heals when attacking the hero, capped at max health", () => {
    const s = makeState({ p0: { health: 29, board: [mob(2, 2, { keywords: { lifesteal: 3 } })] } });
    const r = atk(s, [0, 0], "h1");
    expect(r.state.players[0].hero.health).toBe(30);
    expect(eventsOf(r.events, "HEAL")[0].amount).toBe(1);
  });

  it("a lifesteal defender's retaliation does not heal", () => {
    const s = makeState({ p0: { board: [mob(1, 5)] }, p1: { health: 20, board: [mob(3, 5, { keywords: { lifesteal: 2 } })] } });
    expect(atk(s, [0, 0], [1, 0]).state.players[1].hero.health).toBe(20);
  });

  it("heals even if the attacker dies in the exchange", () => {
    const s = makeState({ p0: { health: 20, board: [mob(2, 1, { keywords: { lifesteal: 2 } })] }, p1: { board: [mob(3, 5)] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toHaveLength(0);
    expect(r.state.players[0].hero.health).toBe(22);
  });
});

describe("Furia (berserk)", () => {
  it("row 14: Furia {50, +3} 3/6 at 3 damage has 6 attack; healed 1 → 3", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(3, 6, { keywords: { berserk: { percent: 50, attack: 3 } } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    const bear = unitAt(r.state, 1, 0);
    expect(getHealth(bear)).toBe(3);
    expect(getAttack(bear)).toBe(6);
    expect(heal(newCtx(r.state), "h1", bear.iid, 1)).toBe(1);
    expect(getAttack(bear)).toBe(3);
  });

  it("the bonus is not active above the threshold and is not used for the triggering retaliation", () => {
    // Damage is simultaneous: the defender's retaliation uses its attack before this combat's damage.
    const s = makeState({ p0: { board: [mob(4, 9)] }, p1: { board: [mob(3, 6, { keywords: { berserk: { percent: 50, attack: 3 } } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(6);
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(6);
  });

  it("a silenced Furia unit gets no bonus", () => {
    const s = makeState({ p0: { board: [mob(3, 6, { damage: 4, keywords: { berserk: { percent: 50, attack: 3 } } })] } });
    expect(getAttack(unitAt(s, 0, 0))).toBe(6);
    s.players[0].board[0].silenced = true;
    expect(getAttack(unitAt(s, 0, 0))).toBe(3);
  });
});

describe("Espinas (thorns)", () => {
  it("row 15: Espinas 2 defender 1/5 vs attacker 3/3 → attacker dies, defender at 2", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: { thorns: 2 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toHaveLength(0);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(2);
    expect(eventsOf(r.events, "DAMAGE").map((d) => [d.amount, d.healthAfter])).toEqual([[3, 2], [1, 2], [2, 0]]);
  });

  it("Espinas killing the attacker while the attacker kills the target → both die", () => {
    const s = makeState({ p0: { board: [mob(5, 2)] }, p1: { board: [mob(0, 3, { keywords: { thorns: 2 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players.map((p) => p.board.length)).toEqual([0, 0]);
  });

  it("Barrido splash does not trigger a neighbour's Espinas", () => {
    const s = makeState({ p0: { board: [mob(1, 9, { keywords: { cleave: true } })] }, p1: { board: [mob(0, 5), mob(0, 5, { keywords: { thorns: 3 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(9);
  });

  it("the attacker's Escudo can block the thorns instance", () => {
    const s = makeState({ p0: { board: [mob(1, 3, { keywords: { shield: 1 } })] }, p1: { board: [mob(0, 5, { keywords: { thorns: 2 } })] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(3);
    expect(eventsOf(r.events, "DAMAGE").at(-1)).toMatchObject({ amount: 2, dealt: 0, blocked: "shield" });
  });

  it("Espinas does not apply when the Espinas unit attacks", () => {
    const s = makeState({ p0: { board: [mob(1, 5, { keywords: { thorns: 2 } })] }, p1: { board: [mob(1, 5)] } });
    expect(getHealth(unitAt(atk(s, [0, 0], [1, 0]).state, 1, 0))).toBe(4);
  });
});

describe("Regeneración and healing", () => {
  it("row 17: Regeneración 2 unit damaged by 3 → damage 1 after its controller's turn", () => {
    const s = makeState({ p0: { board: [mob(1, 5, { damage: 3, keywords: { regeneration: 2 } })] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state.players[0].board[0].damage).toBe(1);
    const healIdx = eventTypes(r.events).indexOf("HEAL");
    expect(healIdx).toBe(eventTypes(r.events).indexOf("TURN_ENDED") + 1);
    expect(eventsOf(r.events, "HEAL")).toMatchObject([{ amount: 2, healthAfter: 4 }]);
  });

  it("row 18: an undamaged Regeneración unit emits no HEAL", () => {
    const s = makeState({ p0: { board: [mob(1, 5, { keywords: { regeneration: 2 } })] } });
    expect(eventsOf(act(s, 0, { t: "endTurn" }).events, "HEAL")).toEqual([]);
  });

  it("Regeneración only ticks at the end of its controller's turn", () => {
    const s = makeState({ active: 1, p0: { board: [mob(1, 5, { damage: 3, keywords: { regeneration: 2 } })] } });
    expect(act(s, 1, { t: "endTurn" }).state.players[0].board[0].damage).toBe(3);
  });

  it("Regeneración heals before endOfTurn buffs expire", () => {
    // 1/2 with a +0/+3 this-turn buff and 4 damage: regen 2 → 2 damage; buff expires → health min(3, 2) = 2.
    const s = makeState({
      p0: { board: [mob(1, 2, { damage: 4, keywords: { regeneration: 2 }, modifiers: [{ attack: 0, health: 3, expires: "endOfTurn", sourceId: "h0" }] })] },
    });
    const u = act(s, 0, { t: "endTurn" }).state.players[0].board[0];
    expect(getHealth(u)).toBe(2);
  });

  it("row 19: healing a hero at 29 by 4 → 30 (HEAL amount 1)", () => {
    const s = makeState({ p0: { health: 29 } });
    const ctx = newCtx(s);
    expect(heal(ctx, "h0", "h0", 4)).toBe(1);
    expect(s.players[0].hero.health).toBe(30);
    expect(eventsOf(ctx.events, "HEAL")).toMatchObject([{ target: "h0", amount: 1, healthAfter: 30 }]);
  });

  it("healing a full-health target or by 0 emits nothing; units are capped at max health", () => {
    const s = makeState({ p0: { board: [mob(1, 5, { damage: 2 })] } });
    const ctx = newCtx(s);
    expect(heal(ctx, "h0", "h0", 3)).toBe(0);
    expect(heal(ctx, "h0", unitAt(s, 0, 0).iid, 0)).toBe(0);
    expect(heal(ctx, "h0", unitAt(s, 0, 0).iid, 9)).toBe(2);
    expect(getHealth(unitAt(s, 0, 0))).toBe(5);
    expect(eventTypes(ctx.events)).toEqual(["HEAL"]);
  });

  it("dead units cannot be healed", () => {
    const s = makeState({ p0: { board: [mob(1, 2, { damage: 2 })] } });
    expect(heal(newCtx(s), "h0", unitAt(s, 0, 0).iid, 5)).toBe(0);
  });

  it("damage records lastDamagedBy only when it lands", () => {
    const s = makeState({ p0: { board: [mob(2, 5)] }, p1: { board: [mob(1, 5), mob(1, 5, { keywords: { shield: 1 } })] } });
    const attacker = unitAt(s, 0, 0).iid;
    let r = atk(s, [0, 0], [1, 0]);
    expect(unitAt(r.state, 1, 0).lastDamagedBy).toBe(attacker);
    r = atk(nextOwnTurn(r.state), [0, 0], [1, 1]);
    expect(unitAt(r.state, 1, 1).lastDamagedBy).toBeNull();
  });
});
