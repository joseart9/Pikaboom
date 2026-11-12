import { describe, expect, it } from "vitest";
import { act, eventsOf, eventTypes, makeState } from "../testing/fixtures";
import { newMatch } from "../testing/matches";
import type { EngineCommand } from "./commands";
import { getAttack, getHealth } from "./stats";
import type { MatchState, Seat } from "./types";

/** A fresh match after both players kept their hands (turn 1 started). */
function started(): MatchState {
  let s = newMatch();
  s = act(s, 0, { t: "mulligan", replace: [] }).state;
  return act(s, 1, { t: "mulligan", replace: [] }).state;
}

function endTurn(s: MatchState): MatchState {
  return act(s, s.turn.activeSeat, { t: "endTurn" }).state;
}

describe("turns & mana", () => {
  it("row 4: after 10 turns each max mana is 5; never above 10 after 25 turns", () => {
    let s = started();
    for (let i = 0; i < 9; i++) s = endTurn(s);
    expect(s.turn.number).toBe(10);
    expect(s.players.map((p) => p.mana.max)).toEqual([5, 5]);
    for (let i = 0; i < 15; i++) {
      s = endTurn(s);
      for (const p of s.players) expect(p.mana.max).toBeLessThanOrEqual(10);
    }
    expect(s.players.map((p) => p.mana.max)).toEqual([10, 10]);
    expect(s.players[s.turn.activeSeat].mana.current).toBe(10);
  });

  it("alternates the active seat and numbers turns globally", () => {
    let s = started();
    const first = s.firstSeat;
    const seen: [number, Seat][] = [[s.turn.number, s.turn.activeSeat]];
    for (let i = 0; i < 3; i++) {
      s = endTurn(s);
      seen.push([s.turn.number, s.turn.activeSeat]);
    }
    const second = (1 - first) as Seat;
    expect(seen).toEqual([[1, first], [2, second], [3, first], [4, second]]);
  });

  it("endTurn by the inactive seat → not_your_turn", () => {
    const s = makeState({ active: 0 });
    expect(() => act(s, 1, { t: "endTurn" })).toThrow("not_your_turn");
  });

  it("emits TURN_ENDED → TURN_STARTED → draw in order", () => {
    const s = makeState({ p1: { deck: ["squire"] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(eventTypes(r.events)).toEqual(["TURN_ENDED", "MANA_CHANGED", "TURN_STARTED", "CARD_DRAWN"]);
    expect(eventsOf(r.events, "TURN_ENDED")[0]).toMatchObject({ seat: 0, turn: 1, timeout: false });
    expect(r.state.players[1].mana).toMatchObject({ current: 10, max: 10 });
  });

  it("expires endOfTurn modifiers on both boards and clears temporary mana", () => {
    const s = makeState({
      p0: { board: [{ defId: "test-2-3", modifiers: [{ attack: 3, health: 2, expires: "endOfTurn", sourceId: "c9" }], damage: 4 }] },
      p1: { board: [{ defId: "test-2-3", modifiers: [{ attack: 1, health: 0, expires: "never", sourceId: "c9" }] }] },
    });
    s.players[0].mana.temporary = 2;
    const r = act(s, 0, { t: "endTurn" });
    const u = r.state.players[0].board[0];
    expect([getAttack(u), getHealth(u)]).toEqual([2, 1]); // 5/5 with 4 damage → buff gone: min(1, 3) = 1
    expect(getAttack(r.state.players[1].board[0])).toBe(3); // permanent modifier stays
    expect(r.state.players[0].mana.temporary).toBe(0);
    expect(eventsOf(r.events, "STATS_CHANGED")).toHaveLength(1);
  });

  it("losing a health buff never kills", () => {
    const s = makeState({ p0: { board: [{ defId: "test-1-1", modifiers: [{ attack: 0, health: 3, expires: "endOfTurn", sourceId: "x" }], damage: 3 }] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state.players[0].board).toHaveLength(1);
    expect(getHealth(r.state.players[0].board[0])).toBe(1);
  });
});

describe("draw, burn, fatigue", () => {
  it("row 8: drawing with 10 cards in hand burns the card (revealed)", () => {
    const hand = Array(10).fill("squire");
    const s = makeState({ p1: { hand, deck: ["ignis", "squire"] } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state.players[1].hand).toHaveLength(10);
    expect(r.state.players[1].deck).toHaveLength(1);
    expect(eventsOf(r.events, "CARD_BURNED")).toEqual([expect.objectContaining({ seat: 1, defId: "ignis" })]);
    expect(eventsOf(r.events, "CARD_DRAWN")).toHaveLength(0);
  });

  it("row 9: empty deck ⇒ fatigue 1, 2, 3 on consecutive own turns", () => {
    let s = makeState({ active: 1 });
    const damage: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = act(s, s.turn.activeSeat, { t: "endTurn" });
      s = r.state;
      if (s.turn.activeSeat === 0) {
        expect(eventTypes(r.events)).toEqual(expect.arrayContaining(["FATIGUE", "DAMAGE"]));
        damage.push(eventsOf(r.events, "FATIGUE")[0].amount);
      }
    }
    expect(damage).toEqual([1, 2, 3]);
    expect(s.players[0].hero.health).toBe(30 - 6);
    const dmg = eventsOf(s.log, "DAMAGE").find((e) => e.target === "h0")!;
    expect(dmg).toMatchObject({ source: "fatigue", kind: "fatigue", blocked: null });
  });

  it("row 10: lethal fatigue at turn start ends the game before the player acts", () => {
    const s = makeState({ active: 0, p1: { health: 2 } });
    s.players[1].fatigue = 2;
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state.players[1].hero.health).toBe(-1);
    expect(r.state).toMatchObject({ phase: "finished", winner: 0, endReason: "hero_destroyed" });
    expect(eventTypes(r.events).slice(-3)).toEqual(["FATIGUE", "DAMAGE", "GAME_OVER"]);
  });
});

describe("game end", () => {
  it("row 11: seat 1 concedes during seat 0's turn", () => {
    const r = act(makeState({ active: 0 }), 1, { t: "concede" });
    expect(r.state).toMatchObject({ phase: "finished", winner: 0, endReason: "concede" });
    expect(eventsOf(r.events, "GAME_OVER")).toEqual([expect.objectContaining({ winner: 0, reason: "concede" })]);
  });

  it("row 12: 3 consecutive timeouts without acting ⇒ abandon", () => {
    let s = makeState({ active: 0, p0: { deck: Array(10).fill("squire") }, p1: { deck: Array(10).fill("squire") } });
    const steps: EngineCommand[] = [{ t: "timeout" }, { t: "endTurn" }, { t: "timeout" }, { t: "endTurn" }];
    for (const cmd of steps) s = act(s, s.turn.activeSeat, cmd).state;
    expect(s.players[0].consecutiveTimeouts).toBe(2);
    const r = act(s, 0, { t: "timeout" });
    expect(r.state).toMatchObject({ phase: "finished", winner: 1, endReason: "abandon" });
    expect(eventTypes(r.events)).toEqual(["GAME_OVER"]); // no next turn
  });

  it("row 13: acting in a turn resets the timeout streak", () => {
    let s = makeState({ active: 0, p0: { deck: Array(10).fill("squire"), hand: ["test-1-1"] }, p1: { deck: Array(10).fill("squire") } });
    s = act(s, 0, { t: "timeout" }).state;
    s = act(s, 1, { t: "endTurn" }).state;
    s = act(s, 0, { t: "timeout" }).state;
    s = act(s, 1, { t: "endTurn" }).state;
    expect(s.players[0].consecutiveTimeouts).toBe(2);
    s = act(s, 0, { t: "play", card: s.players[0].hand.find((c) => c.defId === "test-1-1")!.iid }).state;
    expect(s.players[0].consecutiveTimeouts).toBe(0);
    s = act(s, 0, { t: "timeout" }).state; // acted this turn → no increment
    expect(s.players[0].consecutiveTimeouts).toBe(0);
    s = act(s, 1, { t: "endTurn" }).state;
    s = act(s, 0, { t: "timeout" }).state;
    expect(s.phase).toBe("playing");
    expect(s.players[0].consecutiveTimeouts).toBe(1);
    expect(eventsOf(s.log, "TURN_ENDED").at(-1)).toMatchObject({ seat: 0, timeout: true });
  });

  it("row 14: the end of turn 80 is a draw by turn limit", () => {
    const r = act(makeState({ turn: 80, active: 1 }), 1, { t: "endTurn" });
    expect(r.state).toMatchObject({ phase: "finished", winner: "draw", endReason: "turn_limit" });
    expect(eventTypes(r.events)).toEqual(["TURN_ENDED", "GAME_OVER"]);
  });

  it("both heroes at 0 ⇒ mutual destruction draw", () => {
    // e.g. after simultaneous damage; checked on the next resolve
    const s = makeState({ active: 0, p0: { health: 0 }, p1: { health: -2 } });
    const r = act(s, 0, { t: "endTurn" });
    expect(r.state).toMatchObject({ winner: "draw", endReason: "mutual_destruction" });
  });

  it("row 15: every command on a finished game → game_over", () => {
    const done = act(makeState(), 0, { t: "concede" }).state;
    const cmds: EngineCommand[] = [
      { t: "endTurn" }, { t: "concede" }, { t: "timeout" }, { t: "play", card: "c1" },
      { t: "mulligan", replace: [] }, { t: "attack", attacker: "c1", target: "h1" }, { t: "mulliganTimeout", seat: 0 },
    ];
    for (const cmd of cmds) for (const seat of [0, 1] as const) expect(() => act(done, seat, cmd)).toThrow("game_over");
  });
});
