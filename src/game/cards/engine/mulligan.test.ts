import { describe, expect, it } from "vitest";
import { act, eventsOf, eventTypes } from "../testing/fixtures";
import { newMatch } from "../testing/matches";
import { otherSeat } from "./ids";

describe("mulligan", () => {
  it("row 3: seat 0 replaces 2, seat 1 keeps ⇒ playing, turn 1 for firstSeat, bonus card, first draw", () => {
    const s0 = newMatch();
    const first = s0.firstSeat;
    const second = otherSeat(first);
    const replace = s0.players[0].hand.slice(0, 2).map((c) => c.iid);
    const startHand0 = s0.players[0].hand.length;

    const r1 = act(s0, 0, { t: "mulligan", replace });
    expect(r1.state.phase).toBe("mulligan");
    const done = eventsOf(r1.events, "MULLIGAN_DONE")[0];
    expect(done.replaced).toEqual(replace);
    expect(done.drawn).toHaveLength(2);
    expect(eventTypes(r1.events)).toEqual(["MULLIGAN_DONE"]); // no CARD_DRAWN for replacements
    // Replaced cards went back into the deck, not into the hand.
    const deckIids = r1.state.players[0].deck.map((c) => c.iid);
    for (const iid of replace) expect(deckIids).toContain(iid);
    expect(r1.state.players[0].hand.map((c) => c.iid)).not.toEqual(expect.arrayContaining(replace));
    expect(r1.state.players[0].hand).toHaveLength(startHand0);

    const r2 = act(r1.state, 1, { t: "mulligan", replace: [] });
    const s = r2.state;
    expect(s.phase).toBe("playing");
    expect(s.turn).toEqual({ number: 1, activeSeat: first });
    expect(s.players[first].mana).toMatchObject({ current: 1, max: 1, temporary: 0 });
    expect(s.players[second].mana).toMatchObject({ current: 0, max: 0 });
    expect(s.players[first].hand).toHaveLength(3 + 1); // opening 3 + turn draw
    expect(s.players[second].hand).toHaveLength(4 + 1); // opening 4 + Chispa de Maná
    expect(s.players[second].hand.at(-1)!.defId).toBe("mana-spark");
    expect(eventTypes(r2.events)).toEqual([
      "MULLIGAN_DONE", "CARD_ADDED_TO_HAND", "MANA_CHANGED", "TURN_STARTED", "CARD_DRAWN",
    ]);
  });

  it("rejects ids not in hand, duplicates and non-arrays", () => {
    const s = newMatch();
    const own = s.players[0].hand[0].iid;
    const foe = s.players[1].hand[0].iid;
    expect(() => act(s, 0, { t: "mulligan", replace: [foe] })).toThrow("invalid_mulligan");
    expect(() => act(s, 0, { t: "mulligan", replace: [own, own] })).toThrow("invalid_mulligan");
    expect(() => act(s, 0, { t: "mulligan", replace: "c1" as unknown as string[] })).toThrow("invalid_mulligan");
    expect(() => act(s, 0, { t: "mulligan", replace: [s.players[0].deck[0].iid] })).toThrow("invalid_mulligan");
  });

  it("allows only one mulligan per player", () => {
    const { state } = act(newMatch(), 0, { t: "mulligan", replace: [] });
    expect(() => act(state, 0, { t: "mulligan", replace: [] })).toThrow("already_mulliganed");
  });

  it("only mulligan, concede and mulliganTimeout are accepted during the mulligan", () => {
    const s = newMatch();
    const card = s.players[s.firstSeat].hand[0].iid;
    expect(() => act(s, s.firstSeat, { t: "play", card })).toThrow("wrong_phase");
    expect(() => act(s, s.firstSeat, { t: "endTurn" })).toThrow("wrong_phase");
    expect(() => act(s, s.firstSeat, { t: "timeout" })).toThrow("wrong_phase");
    expect(() => act(s, 0, { t: "attack", attacker: "c1", target: "h1" })).toThrow("wrong_phase");
    const conceded = act(s, 1, { t: "concede" }).state;
    expect([conceded.phase, conceded.winner, conceded.endReason]).toEqual(["finished", 0, "concede"]);
  });

  it("mulliganTimeout keeps the hand for that seat (system command ignores the sender seat)", () => {
    const s = newMatch();
    const hand1 = s.players[1].hand.map((c) => c.iid);
    const r = act(s, 0, { t: "mulliganTimeout", seat: 1 });
    expect(r.state.players[1].mulliganDone).toBe(true);
    expect(r.state.players[1].hand.map((c) => c.iid)).toEqual(hand1);
    expect(r.state.players[0].mulliganDone).toBe(false);
    const r2 = act(r.state, 1, { t: "mulliganTimeout", seat: 0 });
    expect(r2.state.phase).toBe("playing");
  });

  it("a replaced card never comes straight back", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = newMatch(seed.toString(16).padStart(32, "0"));
      const replace = s.players[0].hand.map((c) => c.iid);
      const after = act(s, 0, { t: "mulligan", replace }).state;
      for (const iid of replace) expect(after.players[0].hand.map((c) => c.iid)).not.toContain(iid);
    }
  });
});
