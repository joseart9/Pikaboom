// Behavior of the real catalog cards whose rules are keywords only (vanilla and keyword mobs). Cards with
// abilities are covered in spells.test.ts, deaths.test.ts and triggers.test.ts; the last test here checks that
// every catalog card is exercised by at least one engine test (STATUS.md "Engine card-behavior coverage").
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import type { CardId } from "../catalog/types";
import { act, eventsOf, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { getLegalActions } from "./legal";
import { getAttack, getHealth } from "./stats";
import type { MatchState, Seat } from "./types";

const mob = (attack: number, health: number): UnitSpec => ({ defId: "test-1-1", attack, health });

function atk(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

function playMob(s: MatchState, defId: CardId) {
  const card = s.players[0].hand.find((c) => c.defId === defId)!.iid;
  return act(s, 0, { t: "play", card });
}

describe("keyword and vanilla catalog cards", () => {
  it("squire 1/2 and forest-boar 3/2 are vanilla: played asleep, trade normally", () => {
    let s = makeState({ p0: { hand: ["squire"], board: ["forest-boar"] }, p1: { board: [mob(1, 3)] } });
    s = playMob(s, "squire").state;
    expect(getLegalActions(s, 0).attacks[unitAt(s, 0, 1).iid]).toBeUndefined();
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[1].board).toHaveLength(0);
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(1);
  });

  it("wolf-pup (Embestida) attacks a mob on its summon turn but not the hero", () => {
    let s = makeState({ p0: { hand: ["wolf-pup"] }, p1: { board: [mob(0, 2)] } });
    s = playMob(s, "wolf-pup").state;
    expect(getLegalActions(s, 0).attacks[unitAt(s, 0, 0).iid]).toEqual([unitAt(s, 1, 0).iid]);
    expect(() => atk(s, [0, 0], "h1")).toThrow("rush_no_hero");
  });

  it("shield-bearer and stone-golem (Provocar) must be attacked first", () => {
    for (const taunt of ["shield-bearer", "stone-golem"]) {
      const s = makeState({ p0: { board: [mob(2, 9)] }, p1: { board: [mob(1, 1), taunt] } });
      expect(() => atk(s, [0, 0], "h1"), taunt).toThrow("must_attack_taunt");
      expect(() => atk(s, [0, 0], [1, 0]), taunt).toThrow("must_attack_taunt");
      expect(() => atk(s, [0, 0], [1, 1]), taunt).not.toThrow();
    }
  });

  it("iron-guard (Escudo 1) blocks the first combat hit only", () => {
    let s = makeState({ p0: { board: [mob(3, 9), mob(3, 9)] }, p1: { board: ["iron-guard"] } });
    s = atk(s, [0, 0], [1, 0]).state;
    expect(getHealth(unitAt(s, 1, 0))).toBe(4);
    s = atk(s, [0, 1], [1, 0]).state;
    expect(getHealth(unitAt(s, 1, 0))).toBe(1);
  });

  it("bone-wall (Provocar + Escudo 2) forces attacks and blocks two hits", () => {
    let s = makeState({ p0: { board: [mob(2, 9), mob(2, 9), mob(2, 9)] }, p1: { board: ["bone-wall"] } });
    expect(() => atk(s, [0, 0], "h1")).toThrow("must_attack_taunt");
    for (const i of [0, 1, 2]) s = atk(s, [0, i], [1, 0]).state;
    expect(getHealth(unitAt(s, 1, 0))).toBe(2);
  });

  it("berserker-bear (Furia 50%, +3) hits harder when at half health", () => {
    const s = makeState({ p0: { board: [mob(3, 9)] }, p1: { board: ["berserker-bear"] } });
    const r = atk(s, [0, 0], [1, 0]); // 5 → 2 (≤ 50%)
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(6);
  });

  it("thornback-tortoise (Provocar + Espinas 2) punishes attackers", () => {
    const s = makeState({ p0: { board: [mob(2, 3)] }, p1: { board: ["thornback-tortoise"] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[0].board).toHaveLength(0); // 1 retaliation + 2 thorns
  });

  it("twin-claw-panther (Golpe Doble) attacks twice", () => {
    let s = makeState({ p0: { board: ["twin-claw-panther"] } });
    s = atk(s, [0, 0], "h1").state;
    s = atk(s, [0, 0], "h1").state;
    expect(s.players[1].hero.health).toBe(24);
    expect(() => atk(s, [0, 0], "h1")).toThrow("cannot_attack");
  });

  it("line-breaker (Barrido) splashes both neighbours", () => {
    const s = makeState({ p0: { board: ["line-breaker"] }, p1: { board: [mob(0, 5), mob(0, 5), mob(0, 5)] } });
    const r = atk(s, [0, 0], [1, 1]);
    expect(r.state.players[1].board.map(getHealth)).toEqual([1, 1, 1]);
  });

  it("swamp-ent (Regeneración 2) heals at the end of its controller's turn", () => {
    const s = makeState({ p0: { board: [{ defId: "swamp-ent", damage: 3 }] } });
    expect(getHealth(unitAt(act(s, 0, { t: "endTurn" }).state, 0, 0))).toBe(4);
  });

  it("vampire-bat (Robo de Vida 2) heals its hero when it deals damage", () => {
    const s = makeState({ p0: { board: ["vampire-bat"], health: 20 } });
    const r = atk(s, [0, 0], "h1");
    expect(r.state.players[0].hero.health).toBe(22);
    expect(eventsOf(r.events, "HEAL")).toHaveLength(1);
  });
});

describe("catalog coverage", () => {
  it("every catalog card id is used by at least one engine test", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const tests = readdirSync(dir)
      .filter((f) => f.endsWith(".test.ts"))
      .map((f) => readFileSync(dir + f, "utf8"))
      .join("\n");
    const missing = Object.keys(CATALOG).filter((id) => !tests.includes(`"${id}"`));
    expect(missing).toEqual([]);
  });
});
