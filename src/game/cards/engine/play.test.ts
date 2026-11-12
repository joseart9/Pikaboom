import { describe, expect, it } from "vitest";
import { act, deepFreeze, eventsOf, eventTypes, handIds, makeState, unitAt } from "../testing/fixtures";
import { EngineError } from "./errors";
import { getLegalActions } from "./legal";
import { isSleeping } from "./stats";

function iidOf(s: ReturnType<typeof makeState>, defId: string): string {
  return s.players[s.turn.activeSeat].hand.find((c) => c.defId === defId)!.iid;
}

describe("playing mobs", () => {
  it("row 5: not enough mana → error, input untouched", () => {
    const s = deepFreeze(makeState({ p0: { hand: ["test-5-5"], mana: 3 } }));
    const before = structuredClone(s);
    expect(() => act(s, 0, { t: "play", card: iidOf(s, "test-5-5") })).toThrow("not_enough_mana");
    expect(s).toEqual(before);
  });

  it("row 6: board of 6 → board_full", () => {
    const s = makeState({ p0: { board: Array(6).fill("test-1-1"), hand: ["test-1-1"] } });
    expect(() => act(s, 0, { t: "play", card: iidOf(s, "test-1-1") })).toThrow("board_full");
  });

  it("row 7: plays at a position, unit sleeps, events in order", () => {
    const s = makeState({ p0: { board: ["test-1-1", "test-2-3"], hand: ["test-5-5"], mana: 6 } });
    const card = iidOf(s, "test-5-5");
    const r = act(s, 0, { t: "play", card, position: 1 });
    expect(r.state.players[0].board.map((u) => u.defId)).toEqual(["test-1-1", "test-5-5", "test-2-3"]);
    const u = unitAt(r.state, 0, 1);
    expect(u.iid).toBe(card); // the unit keeps the card's iid
    expect(isSleeping(r.state, u)).toBe(true);
    expect(eventTypes(r.events)).toEqual(["CARD_PLAYED", "MANA_CHANGED", "MOB_SUMMONED"]);
    expect(eventsOf(r.events, "CARD_PLAYED")[0]).toMatchObject({ seat: 0, iid: card, defId: "test-5-5", target: null, position: 1 });
    expect(eventsOf(r.events, "MOB_SUMMONED")[0]).toMatchObject({
      seat: 0, index: 1, cause: "play", sourceId: null,
      unit: { iid: card, attack: 5, health: 5, maxHealth: 5, sleeping: true },
    });
    expect(r.state.players[0].mana).toMatchObject({ current: 1, max: 6 });
    expect(r.state.players[0].turnCounters).toEqual({ cardsPlayed: 1, spellsCast: 0, mobsPlayed: 1 });
    expect(handIds(r.state, 0)).toEqual([]);
  });

  it("defaults to the right end and pays temporary mana first", () => {
    const s = makeState({ p0: { board: ["test-1-1"], hand: ["test-2-3"], mana: 1 } });
    s.players[0].mana.temporary = 1;
    const r = act(s, 0, { t: "play", card: iidOf(s, "test-2-3") });
    expect(r.state.players[0].board.map((u) => u.defId)).toEqual(["test-1-1", "test-2-3"]);
    expect(r.state.players[0].mana).toMatchObject({ current: 0, temporary: 0 });
  });

  it.each([-1, 3, 1.5, Number.NaN])("position %s → invalid_position", (position) => {
    const s = makeState({ p0: { board: ["test-1-1", "test-1-1"], hand: ["test-1-1"] } });
    expect(() => act(s, 0, { t: "play", card: iidOf(s, "test-1-1"), position })).toThrow("invalid_position");
  });

  it("rejects cards not in the player's hand, out of turn and wrong targets", () => {
    const s = makeState({ p0: { hand: ["test-1-1"] }, p1: { hand: ["test-1-1"] } });
    expect(() => act(s, 0, { t: "play", card: s.players[1].hand[0].iid })).toThrow("card_not_in_hand");
    expect(() => act(s, 1, { t: "play", card: s.players[1].hand[0].iid })).toThrow("not_your_turn");
    expect(() => act(s, 0, { t: "play", card: iidOf(s, "test-1-1"), target: "h1" })).toThrow("unexpected_target");
  });

  it("Gritos de Guerra resolve immediately (grave-digger summons a skeleton to its right)", () => {
    const s = makeState({ p0: { hand: ["grave-digger"], board: ["test-1-1"] } });
    const r = act(s, 0, { t: "play", card: iidOf(s, "grave-digger"), position: 0 });
    expect(r.state.players[0].board.map((u) => u.defId)).toEqual(["grave-digger", "skeleton", "test-1-1"]);
    expect(eventTypes(r.events)).toEqual(["CARD_PLAYED", "MANA_CHANGED", "MOB_SUMMONED", "TRIGGER_ACTIVATED", "MOB_SUMMONED"]);
  });

  it("errors carry their code", () => {
    const s = makeState({ p0: { hand: ["test-5-5"], mana: 0 } });
    try {
      act(s, 0, { t: "play", card: iidOf(s, "test-5-5") });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError);
      expect((e as EngineError).code).toBe("not_enough_mana");
    }
  });
});

describe("getLegalActions (plays)", () => {
  it("lists affordable cards (mobs with room, spells with targets), endTurn for the active seat only", () => {
    const s = makeState({ p0: { hand: ["test-1-1", "test-5-5", "arcane-spark"], mana: 3, board: ["test-2-3"] }, p1: { hand: ["test-1-1"] } });
    const legal = getLegalActions(s, 0);
    expect(Object.keys(legal.play)).toEqual([iidOf(s, "test-1-1"), iidOf(s, "arcane-spark")]);
    expect(legal.play[iidOf(s, "test-1-1")]).toEqual({ needsPosition: true, targets: null, targetRequired: false });
    expect(legal.play[iidOf(s, "arcane-spark")]).toEqual({ needsPosition: false, targets: [unitAt(s, 0, 0).iid, "h0", "h1"], targetRequired: true });
    expect(legal).toMatchObject({ mulligan: false, attacks: { [unitAt(s, 0, 0).iid]: ["h1"] }, endTurn: true });
    expect(getLegalActions(s, 1)).toEqual({ mulligan: false, play: {}, attacks: {}, endTurn: false });
  });

  it("every listed play is accepted and every unlisted hand card is rejected", () => {
    const s = makeState({ p0: { hand: ["test-1-1", "test-2-3", "test-5-5", "test-0-3", "test-spell-noop", "squire"], mana: 2, board: Array(5).fill("test-1-1") } });
    const legal = getLegalActions(s, 0);
    for (const card of s.players[0].hand) {
      const run = () => act(s, 0, { t: "play", card: card.iid });
      if (legal.play[card.iid]) expect(run, card.defId).not.toThrow();
      else expect(run, card.defId).toThrow(EngineError);
    }
  });
});
