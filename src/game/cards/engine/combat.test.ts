import { describe, expect, it } from "vitest";
import type { CardId, Keywords } from "../catalog/types";
import { act, eventsOf, eventTypes, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { EngineError } from "./errors";
import { getLegalActions } from "./legal";
import { rngInt, seedToRng, type RngState } from "./rng";
import { getHealth } from "./stats";
import type { MatchState, Seat } from "./types";

/** A vanilla unit with the given stats (test-1-1 base overridden). */
function mob(attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec {
  return { defId: "test-1-1", attack, health, ...extra };
}

function atk(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

describe("combat basics (§6.7, §8.4)", () => {
  it("row 1: simultaneous damage — 3/2 attacks 2/4: attacker dies, defender at 1", () => {
    const s = makeState({ p0: { board: [mob(3, 2)] }, p1: { board: [mob(2, 4)] } });
    const attackerId = unitAt(s, 0, 0).iid;
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toHaveLength(0);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(1);
    expect(eventsOf(r.events, "MOB_DESTROYED")).toMatchObject([{ iid: attackerId, seat: 0, index: 0 }]);
    expect(eventTypes(r.events)).toEqual(["ATTACK_DECLARED", "DAMAGE", "DAMAGE", "MOB_DESTROYED"]);
    expect(eventsOf(r.events, "DAMAGE")).toMatchObject([
      { source: attackerId, amount: 3, dealt: 3, kind: "combat", blocked: null, healthAfter: 1 },
      { target: attackerId, amount: 2, dealt: 2, kind: "combat", blocked: null, healthAfter: 0 },
    ]);
    expect(r.state.players[0].graveyard.map((g) => g.iid)).toEqual([attackerId]);
    expect(r.state.players[0].actedThisTurn).toBe(true);
  });

  it("row 2: attacking the hero — 3/2 hits for 3, no retaliation", () => {
    const s = makeState({ p0: { board: [mob(3, 2)] } });
    const r = atk(s, [0, 0], "h1");
    expect(r.state.players[1].hero.health).toBe(27);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(2);
    expect(eventsOf(r.events, "DAMAGE")).toMatchObject([{ target: "h1", amount: 3, dealt: 3, healthAfter: 27 }]);
    expect(unitAt(r.state, 0, 0).attacksThisTurn).toBe(1);
  });

  it("lethal attack ends the game", () => {
    const s = makeState({ p0: { board: [mob(5, 5)] }, p1: { health: 4 } });
    const r = atk(s, [0, 0], "h1");
    expect(r.state).toMatchObject({ phase: "finished", winner: 0, endReason: "hero_destroyed" });
    expect(eventTypes(r.events).at(-1)).toBe("GAME_OVER");
  });

  it("row 3: a sleeping unit cannot attack → summoning_sick", () => {
    const s = makeState({ p0: { board: [mob(3, 3, { sleeping: true })] }, p1: { board: [mob(1, 1)] } });
    expect(() => atk(s, [0, 0], "h1")).toThrow("summoning_sick");
    expect(() => atk(s, [0, 0], [1, 0])).toThrow("summoning_sick");
  });

  it("row 4: sleeping Embestida may attack a mob but not the hero", () => {
    const fresh = () => makeState({ p0: { board: [mob(2, 2, { sleeping: true, keywords: { rush: true } })] }, p1: { board: [mob(1, 3)] } });
    const r = atk(fresh(), [0, 0], [1, 0]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(1);
    expect(() => atk(fresh(), [0, 0], "h1")).toThrow("rush_no_hero");
  });

  it("Embestida on a later turn may attack the hero", () => {
    const s = makeState({ p0: { board: [mob(2, 2, { keywords: { rush: true } })] } });
    expect(atk(s, [0, 0], "h1").state.players[1].hero.health).toBe(28);
  });

  it("Embestida with no enemy mobs on its summon turn has no legal attacks", () => {
    const s = makeState({ p0: { board: [mob(2, 2, { sleeping: true, keywords: { rush: true } })] } });
    expect(getLegalActions(s, 0).attacks).toEqual({});
  });

  it("row 5: sleeping Carga 4/2 attacks the hero", () => {
    const s = makeState({ p0: { board: [mob(4, 2, { sleeping: true, keywords: { charge: true } })] } });
    expect(atk(s, [0, 0], "h1").state.players[1].hero.health).toBe(26);
  });

  it("a freshly played Carga mob can attack the same turn (charging-rhino)", () => {
    const s = makeState({ p0: { hand: ["charging-rhino"] } });
    let r = act(s, 0, { t: "play", card: s.players[0].hand[0].iid });
    const boar = unitAt(r.state, 0, 0);
    expect(getLegalActions(r.state, 0).attacks[boar.iid]).toEqual(["h1"]);
    r = act(r.state, 0, { t: "attack", attacker: boar.iid, target: "h1" });
    expect(r.state.players[1].hero.health).toBe(30 - boar.baseAttack);
  });
});

describe("Provocar (taunt)", () => {
  const taunt: Keywords = { taunt: true };

  it("row 6: with a Provocar A and a normal B, only A may be attacked", () => {
    const fresh = () => makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: taunt }), mob(1, 5)] } });
    expect(() => atk(fresh(), [0, 0], [1, 1])).toThrow("must_attack_taunt");
    expect(() => atk(fresh(), [0, 0], "h1")).toThrow("must_attack_taunt");
    expect(getHealth(unitAt(atk(fresh(), [0, 0], [1, 0]).state, 1, 0))).toBe(2);
    expect(getLegalActions(fresh(), 0).attacks).toEqual({ [unitAt(fresh(), 0, 0).iid]: [unitAt(fresh(), 1, 0).iid] });
  });

  it("row 7: with two Provocar units the attacker may pick either", () => {
    const fresh = () => makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: taunt }), mob(1, 1), mob(1, 5, { keywords: taunt })] } });
    expect(() => atk(fresh(), [0, 0], [1, 0])).not.toThrow();
    expect(() => atk(fresh(), [0, 0], [1, 2])).not.toThrow();
    expect(() => atk(fresh(), [0, 0], [1, 1])).toThrow("must_attack_taunt");
  });

  it("row 8: Carga does not bypass Provocar", () => {
    const s = makeState({ p0: { board: [mob(4, 2, { sleeping: true, keywords: { charge: true } })] }, p1: { board: [mob(1, 3, { keywords: taunt })] } });
    expect(() => atk(s, [0, 0], "h1")).toThrow("must_attack_taunt");
  });

  it("a silenced Provocar unit does not taunt", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(1, 5, { keywords: taunt })] } });
    s.players[1].board[0].silenced = true;
    expect(atk(s, [0, 0], "h1").state.players[1].hero.health).toBe(27);
  });

  it("an exhausted or sleeping enemy can still be attacked", () => {
    const s = makeState({ p0: { board: [mob(2, 2)] }, p1: { board: [mob(1, 3, { sleeping: true, attacksThisTurn: 1 })] } });
    expect(getHealth(unitAt(atk(s, [0, 0], [1, 0]).state, 1, 0))).toBe(1);
  });
});

describe("attack validation", () => {
  const base = () => makeState({ p0: { board: [mob(2, 2), mob(0, 3), mob(1, 1)] }, p1: { board: [mob(1, 1)] } });

  it("0-attack units cannot attack", () => {
    expect(() => atk(base(), [0, 1], "h1")).toThrow("cannot_attack");
  });

  it("only one attack per turn without Golpe Doble", () => {
    const r = atk(base(), [0, 0], "h1");
    expect(() => act(r.state, 0, { t: "attack", attacker: unitAt(r.state, 0, 0).iid, target: "h1" })).toThrow("cannot_attack");
  });

  it("own hero or own unit as target → invalid_target", () => {
    expect(() => atk(base(), [0, 0], "h0")).toThrow("invalid_target");
    expect(() => atk(base(), [0, 0], [0, 2])).toThrow("invalid_target");
  });

  it("unknown attacker or target → unit_not_found; enemy unit as attacker → cannot_attack", () => {
    const s = base();
    expect(() => act(s, 0, { t: "attack", attacker: "c999", target: "h1" })).toThrow("unit_not_found");
    expect(() => act(s, 0, { t: "attack", attacker: unitAt(s, 0, 0).iid, target: "c999" })).toThrow("unit_not_found");
    expect(() => act(s, 0, { t: "attack", attacker: unitAt(s, 1, 0).iid, target: "h1" })).toThrow("cannot_attack");
  });

  it("inactive seat → not_your_turn; mulligan phase → wrong_phase", () => {
    const s = base();
    expect(() => act(s, 1, { t: "attack", attacker: unitAt(s, 1, 0).iid, target: "h0" })).toThrow("not_your_turn");
    const m = base();
    m.phase = "mulligan";
    expect(() => atk(m, [0, 0], "h1")).toThrow("wrong_phase");
  });

  it("attacksThisTurn resets at the start of the controller's turn", () => {
    let s = atk(makeState({ p0: { board: [mob(1, 5)] } }), [0, 0], "h1").state;
    s = act(s, 0, { t: "endTurn" }).state;
    s = act(s, 1, { t: "endTurn" }).state;
    expect(unitAt(s, 0, 0).attacksThisTurn).toBe(0);
    const before = s.players[1].hero.health; // seat 1 took fatigue on its empty-deck turn
    expect(atk(s, [0, 0], "h1").state.players[1].hero.health).toBe(before - 1);
  });

  it("an attack counts as acting (resets the timeout streak)", () => {
    const s = base();
    s.players[0].consecutiveTimeouts = 2;
    expect(atk(s, [0, 0], "h1").state.players[0].consecutiveTimeouts).toBe(0);
  });
});

describe("Golpe Doble and Barrido", () => {
  it("row 13: Golpe Doble 3/5 attacks twice, a third time → cannot_attack", () => {
    let s = makeState({ p0: { board: [mob(3, 5, { keywords: { doubleStrike: true } })] } });
    s = atk(s, [0, 0], "h1").state;
    s = atk(s, [0, 0], "h1").state;
    expect(s.players[1].hero.health).toBe(24);
    expect(() => atk(s, [0, 0], "h1")).toThrow("cannot_attack");
  });

  it("Golpe Doble + Embestida: two mob attacks on the summon turn", () => {
    let s = makeState({ p0: { board: [mob(1, 9, { sleeping: true, keywords: { doubleStrike: true, rush: true } })] }, p1: { board: [mob(0, 5)] } });
    s = atk(s, [0, 0], [1, 0]).state;
    s = atk(s, [0, 0], [1, 0]).state;
    expect(getHealth(unitAt(s, 1, 0))).toBe(3);
  });

  it("row 16: Barrido 4/6 vs [X 2/2, Y 3/5, Z 1/1] targeting Y", () => {
    const s = makeState({ p0: { board: [mob(4, 6, { keywords: { cleave: true } })] }, p1: { board: [mob(2, 2), mob(3, 5), mob(1, 1)] } });
    const [x, y, z] = s.players[1].board.map((u) => u.iid);
    const r = atk(s, [0, 0], [1, 1]);
    expect(r.state.players[1].board.map((u) => u.iid)).toEqual([y]);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(1);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(3); // retaliation from Y only
    expect(eventsOf(r.events, "DAMAGE").map((d) => [d.target, d.dealt])).toEqual([
      [y, 4],
      [unitAt(s, 0, 0).iid, 3],
      [x, 4],
      [z, 4],
    ]);
    expect(eventsOf(r.events, "MOB_DESTROYED").map((d) => [d.iid, d.index])).toEqual([[x, 0], [z, 2]]);
  });

  it("Barrido on the leftmost target splashes only index 1", () => {
    const s = makeState({ p0: { board: [mob(2, 6, { keywords: { cleave: true } })] }, p1: { board: [mob(1, 5), mob(1, 5), mob(1, 5)] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[1].board.map(getHealth)).toEqual([3, 3, 5]);
  });

  it("Barrido does not apply when attacking the hero", () => {
    const s = makeState({ p0: { board: [mob(2, 6, { keywords: { cleave: true } })] }, p1: { board: [mob(1, 5)] } });
    const r = atk(s, [0, 0], "h1");
    expect(r.state.players[1].hero.health).toBe(28);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(5);
  });
});

describe("death order", () => {
  it("row 20: simultaneous deaths are announced active seat first (board order)", () => {
    const s0 = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: [mob(3, 3)] } });
    const r0 = atk(s0, [0, 0], [1, 0]);
    expect(eventsOf(r0.events, "MOB_DESTROYED").map((e) => e.seat)).toEqual([0, 1]);

    const s1 = makeState({ active: 1, p0: { board: [mob(3, 3)] }, p1: { board: [mob(3, 3)] } });
    const r1 = atk(s1, [1, 0], [0, 0]);
    expect(eventsOf(r1.events, "MOB_DESTROYED").map((e) => e.seat)).toEqual([1, 0]);
    expect(r1.state.players.map((p) => p.board.length)).toEqual([0, 0]);
  });
});

describe("legal attacks agree with applyCommand (property test)", () => {
  const KEYWORD_POOL: Keywords[] = [
    {}, {}, {}, { taunt: true }, { rush: true }, { charge: true }, { doubleStrike: true }, { shield: 1 },
    { cleave: true }, { thorns: 1 }, { lifesteal: 2 }, { berserk: { percent: 50, attack: 2 } }, { taunt: true, shield: 2 },
  ];
  const DEFS: CardId[] = ["test-1-1", "test-2-3", "test-5-5", "test-0-3", "squire", "charging-rhino", "bone-wall"];

  function randomUnit(r: { rng: RngState }): UnitSpec {
    const health = 1 + rngInt(r, 6);
    return {
      defId: DEFS[rngInt(r, DEFS.length)],
      attack: rngInt(r, 5), // 0..4 (0 = cannot attack)
      health,
      damage: rngInt(r, health), // keeps the unit alive
      sleeping: rngInt(r, 3) === 0,
      attacksThisTurn: rngInt(r, 4) === 0 ? 1 : 0,
      keywords: KEYWORD_POOL[rngInt(r, KEYWORD_POOL.length)],
    };
  }

  it("for 50 random states every listed attack succeeds and every unlisted target fails", () => {
    const r = { rng: seedToRng("00000000000000000000000000c0ffee") };
    let accepted = 0;
    let rejected = 0;
    for (let n = 0; n < 50; n++) {
      const board = (k: number) => Array.from({ length: k }, () => randomUnit(r));
      const active = rngInt(r, 2) as Seat;
      const s = makeState({ active, p0: { board: board(rngInt(r, 5)) }, p1: { board: board(rngInt(r, 5)) } });
      const foe = (1 - active) as Seat;
      const legal = getLegalActions(s, active);
      const targets = [...s.players[foe].board.map((u) => u.iid), `h${foe}`, ...s.players[active].board.map((u) => u.iid), `h${active}`];
      for (const u of s.players[active].board) {
        for (const target of targets) {
          const listed = legal.attacks[u.iid]?.includes(target) ?? false;
          const run = () => act(s, active, { t: "attack", attacker: u.iid, target });
          if (listed) {
            expect(run, `state ${n} ${u.iid}→${target}`).not.toThrow();
            accepted++;
          } else {
            expect(run, `state ${n} ${u.iid}→${target}`).toThrow(EngineError);
            rejected++;
          }
        }
      }
      // The inactive seat has no attacks.
      expect(getLegalActions(s, foe).attacks).toEqual({});
    }
    expect(accepted).toBeGreaterThan(20);
    expect(rejected).toBeGreaterThan(20);
  });
});
