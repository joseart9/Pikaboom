import { describe, expect, it } from "vitest";
import type { CardId } from "../catalog/types";
import { act, eventsOf, eventTypes, makeState, unitAt, type UnitSpec } from "../testing/fixtures";
import { getAttack, getHealth, getMaxHealth } from "./stats";
import type { MatchState, Seat } from "./types";

const mob = (attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec => ({
  defId: "test-1-1", attack, health, ...extra,
});

function atk(s: MatchState, from: [Seat, number], target: [Seat, number] | "h0" | "h1") {
  const attacker = unitAt(s, from[0], from[1]).iid;
  const t = typeof target === "string" ? target : unitAt(s, target[0], target[1]).iid;
  return act(s, from[0], { t: "attack", attacker, target: t });
}

function play(s: MatchState, defId: CardId, extra: { target?: string; position?: number } = {}) {
  const seat = s.turn.activeSeat;
  const card = s.players[seat].hand.find((c) => c.defId === defId)!.iid;
  return act(s, seat, { t: "play", card, ...extra });
}

const boardIds = (s: MatchState, seat: Seat) => s.players[seat].board.map((u) => u.defId);

describe("Último Aliento (deathrattle)", () => {
  it("row 1: restless-skeleton killed by an attack leaves a skeleton at its index", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: ["test-1-1", "restless-skeleton", "test-2-3"] } });
    const dead = unitAt(s, 1, 1).iid;
    const r = atk(s, [0, 0], [1, 1]);
    expect(boardIds(r.state, 1)).toEqual(["test-1-1", "skeleton", "test-2-3"]);
    const types = eventTypes(r.events);
    expect(types.indexOf("MOB_DESTROYED")).toBeLessThan(types.indexOf("TRIGGER_ACTIVATED"));
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toMatchObject([{ sourceId: dead, abilityId: "deathrattle", defId: "restless-skeleton" }]);
    expect(eventsOf(r.events, "MOB_SUMMONED")).toMatchObject([{ seat: 1, index: 1, cause: "effect", sourceId: dead }]);
  });

  it("row 2: necromancer destroyed on a full board — its skeleton fits at the former index", () => {
    const s = makeState({
      active: 1,
      p0: { board: ["test-1-1", "test-1-1", "necromancer", "test-1-1", "test-1-1", "test-1-1"] },
      p1: { hand: ["soul-harvest"] },
    });
    const r = play(s, "soul-harvest", { target: unitAt(s, 0, 2).iid });
    expect(boardIds(r.state, 0)).toEqual(["test-1-1", "test-1-1", "skeleton", "test-1-1", "test-1-1", "test-1-1"]);
  });

  it("a deathrattle summoning into a full board fizzles", () => {
    // 10 units (after a Desborde); one dies → 9 ≥ 6, so the normal limit blocks the deathrattle summon.
    const s = makeState({ p0: { board: ["restless-skeleton", ...Array(9).fill("test-5-5")] }, p1: { hand: [], board: [] } });
    s.players[0].board[0].damage = 1;
    s.players[0].board[0].pendingDestroy = true;
    const r = act(s, 0, { t: "endTurn" });
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toMatchObject([{ seat: 0, defId: "skeleton", count: 1 }]);
    expect(r.state.players[0].board).toHaveLength(9);
  });

  it("row 3: two deathrattles from one Barrido attack resolve in board order (active seat first)", () => {
    const s = makeState({
      p0: { board: [{ defId: "restless-skeleton", keywords: { cleave: true } }] },
      p1: { board: [mob(1, 2), "restless-skeleton"] },
    });
    const mine = unitAt(s, 0, 0).iid;
    const theirs = unitAt(s, 1, 1).iid;
    const r = atk(s, [0, 0], [1, 0]);
    expect(eventsOf(r.events, "MOB_DESTROYED").map((e) => e.iid)).toEqual([mine, unitAt(s, 1, 0).iid, theirs]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED").map((e) => e.sourceId)).toEqual([mine, theirs]);
    expect(boardIds(r.state, 0)).toEqual(["skeleton"]);
    expect(boardIds(r.state, 1)).toEqual(["skeleton"]); // the 1/2 died too; index 1 is clamped to the empty board
  });

  it("a silenced unit dies without Último Aliento or Renacer", () => {
    const s = makeState({ p0: { hand: ["bone-storm"] }, p1: { board: ["restless-skeleton", { defId: "ignis", damage: 7 }] } });
    s.players[1].board.forEach((u) => (u.silenced = true));
    const r = play(s, "bone-storm");
    expect(r.state.players[1].board).toHaveLength(0);
    expect(eventsOf(r.events, "MOB_DESTROYED")).toHaveLength(2);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
    expect(eventsOf(r.events, "MOB_SUMMONED")).toEqual([]);
  });
});

describe("kill triggers (hungry-ghoul)", () => {
  it("row 4: hungry-ghoul kills a skeleton → 4/3 with 1 damage", () => {
    const s = makeState({ p0: { hand: ["hungry-ghoul"] }, p1: { board: ["skeleton"] } });
    let r = play(s, "hungry-ghoul");
    const ghoul = unitAt(r.state, 0, 0).iid;
    r = act(r.state, 0, { t: "attack", attacker: ghoul, target: unitAt(r.state, 1, 0).iid }); // Embestida
    const g = unitAt(r.state, 0, 0);
    expect(r.state.players[1].board).toHaveLength(0);
    expect([getAttack(g), getMaxHealth(g), getHealth(g)]).toEqual([4, 3, 2]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toMatchObject([{ sourceId: ghoul, abilityId: "onKill" }]);
  });

  it("row 5: hungry-ghoul that dies in the trade gets no kill trigger", () => {
    const s = makeState({ p0: { board: ["hungry-ghoul"] }, p1: { board: [mob(3, 3)] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players.map((p) => p.board.length)).toEqual([0, 0]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
  });

  it("a kill by spell damage is credited to the spell (no unit kill trigger)", () => {
    const s = makeState({ p0: { board: ["hungry-ghoul"], hand: ["arcane-spark"] }, p1: { board: ["skeleton"] } });
    const r = play(s, "arcane-spark", { target: unitAt(s, 1, 0).iid });
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(3);
  });
});

describe("otherDied (crypt-banshee)", () => {
  it("row 8: banshee +1/+1 when restless-skeleton dies, then the skeleton token is summoned", () => {
    const s = makeState({ p0: { board: [mob(3, 3)] }, p1: { board: ["crypt-banshee", "restless-skeleton"] } });
    const banshee = unitAt(s, 1, 0).iid;
    const r = atk(s, [0, 0], [1, 1]);
    const b = unitAt(r.state, 1, 0);
    expect([getAttack(b), getHealth(b)]).toEqual([4, 4]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED").map((e) => [e.sourceId, e.abilityId])).toEqual([
      [banshee, "onUndeadDied"],
      [unitAt(s, 1, 1).iid, "deathrattle"],
    ]);
    expect(boardIds(r.state, 1)).toEqual(["crypt-banshee", "skeleton"]);
  });

  it("ignores non-undead and enemy deaths", () => {
    const s = makeState({ p0: { board: [mob(5, 5), "skeleton"] }, p1: { board: ["crypt-banshee", "test-1-1"] } });
    let r = atk(s, [0, 0], [1, 1]); // friendly non-undead dies
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(3);
    r = act(r.state, 0, { t: "endTurn" });
    r = act(r.state, 1, { t: "attack", attacker: unitAt(r.state, 1, 0).iid, target: unitAt(r.state, 0, 1).iid }); // enemy undead dies
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(3);
  });

  it("units dying in the same step do not see each other's deaths", () => {
    const s = makeState({ p0: { hand: ["morvath"] }, p1: { board: ["crypt-banshee", "restless-skeleton"] } });
    const r = play(s, "morvath");
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED").map((e) => e.abilityId)).toEqual(["battlecry", "deathrattle"]);
    expect(boardIds(r.state, 1)).toEqual(["skeleton"]);
  });
});

describe("Renacer (ignis)", () => {
  it("row 11: ignis returns once with 1 health and without Renacer; dies again → stays dead", () => {
    const s = makeState({ p0: { board: ["test-1-1", { defId: "ignis", damage: 7 }, "test-1-1"], hand: ["arcane-spark", "arcane-spark"] } });
    const first = unitAt(s, 0, 1).iid;
    let r = play(s, "arcane-spark", { target: first });
    const back = unitAt(r.state, 0, 1);
    expect(back.defId).toBe("ignis");
    expect(back.iid).not.toBe(first);
    expect([getHealth(back), getMaxHealth(back)]).toEqual([1, 8]);
    expect(back.keywords.reborn).toBeUndefined();
    expect(back.rebornUsed).toBe(true);
    expect(eventsOf(r.events, "MOB_SUMMONED")).toMatchObject([{ cause: "reborn", index: 1, unit: { health: 1, keywords: {} } }]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]); // no Grito de Guerra on Renacer
    r = play(r.state, "arcane-spark", { target: back.iid });
    expect(boardIds(r.state, 0)).toEqual(["test-1-1", "test-1-1"]);
  });

  it("Último Aliento resolves before Renacer; a deathrattle that fills the board makes Renacer fizzle", () => {
    const s = makeState({
      active: 1,
      p0: { board: [{ defId: "necromancer", keywords: { reborn: true } }, ...Array(5).fill("test-1-1")] },
      p1: { hand: ["soul-harvest"] },
    });
    const r = play(s, "soul-harvest", { target: unitAt(s, 0, 0).iid });
    expect(boardIds(r.state, 0)).toEqual(["skeleton", ...Array(5).fill("test-1-1")]);
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toMatchObject([{ defId: "necromancer", count: 1 }]);
  });

  it("with room, Renacer returns next to the deathrattle summon", () => {
    const s = makeState({ active: 1, p0: { board: [{ defId: "necromancer", keywords: { reborn: true } }, "test-1-1"] }, p1: { hand: ["soul-harvest"] } });
    const r = play(s, "soul-harvest", { target: unitAt(s, 0, 0).iid });
    expect(boardIds(r.state, 0)).toEqual(["necromancer", "skeleton", "test-1-1"]);
  });
});

describe("Resistencia Final (last-stand-knight)", () => {
  it("row 9: 4/6 takes 3 → gains Provocar and +2 attack; further damage doesn't re-trigger", () => {
    const s = makeState({ p0: { board: [mob(3, 9)] }, p1: { board: ["last-stand-knight"] } });
    let r = atk(s, [0, 0], [1, 0]);
    const k = unitAt(r.state, 1, 0);
    expect(getAttack(k)).toBe(6);
    expect(k.keywords.taunt).toBe(true);
    expect(k.thresholdsFired).toEqual(["lastStand"]);
    r = act(r.state, 0, { t: "endTurn" });
    r = act(r.state, 1, { t: "endTurn" });
    r = act(r.state, 0, { t: "attack", attacker: unitAt(r.state, 0, 0).iid, target: unitAt(r.state, 1, 0).iid });
    // Knight 3 → 0 (dies) and no second trigger.
    expect(r.state.players[1].board).toHaveLength(0);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
  });

  it("row 10: taking 6 at once kills it — no trigger", () => {
    const s = makeState({ p0: { board: [mob(6, 9)] }, p1: { board: ["last-stand-knight"] } });
    const r = atk(s, [0, 0], [1, 0]);
    expect(r.state.players[1].board).toHaveLength(0);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
  });

  it("small hits above the threshold don't trigger; the crossing one does", () => {
    const s = makeState({ p0: { board: [mob(1, 9, { keywords: { doubleStrike: true } })], hand: ["arcane-spark"] }, p1: { board: ["last-stand-knight"] } });
    let r = atk(s, [0, 0], [1, 0]); // 6 → 5
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toEqual([]);
    r = play(r.state, "arcane-spark", { target: unitAt(r.state, 1, 0).iid }); // 5 → 3 (= 50%)
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toMatchObject([{ abilityId: "lastStand" }]);
  });
});
