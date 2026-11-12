import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import { STANDARD_RULES } from "../config/rules";
import { eventTypes, TEST_SEED } from "../testing/fixtures";
import { BEAST_DECK, makeSetup, newMatch, UNDEAD_DECK } from "../testing/matches";
import { defsClosure } from "./defs";
import { otherSeat } from "./ids";
import { createMatch } from "./setup";

describe("createMatch", () => {
  it("row 1: same seed and decks ⇒ deep-equal states", () => {
    expect(newMatch(TEST_SEED)).toEqual(newMatch(TEST_SEED));
  });

  it("different seeds ⇒ different shuffles", () => {
    const a = newMatch("00000000000000000000000000000001");
    const b = newMatch("00000000000000000000000000000002");
    expect(a.players[0].deck.map((c) => c.defId)).not.toEqual(b.players[0].deck.map((c) => c.defId));
  });

  it("row 2: first player 3 cards, second 4, decks 27/26, phase mulligan, turn 0", () => {
    const s = newMatch();
    const first = s.firstSeat;
    const second = otherSeat(first);
    expect(s.players[first].hand).toHaveLength(3);
    expect(s.players[second].hand).toHaveLength(4);
    expect(s.players[first].deck).toHaveLength(27);
    expect(s.players[second].deck).toHaveLength(26);
    expect(s.phase).toBe("mulligan");
    expect(s.turn).toEqual({ number: 0, activeSeat: first });
    expect(s.players.map((p) => [p.hero.health, p.mana.max, p.mana.current])).toEqual([[30, 0, 0], [30, 0, 0]]);
    expect(eventTypes(s.log)).toEqual(["MATCH_STARTED", ...Array(7).fill("CARD_DRAWN")]);
  });

  it("keeps each deck's card list and assigns iids after shuffling (seat 0 first)", () => {
    const s = newMatch();
    const ids0 = [...s.players[0].hand, ...s.players[0].deck].map((c) => c.defId).sort();
    const ids1 = [...s.players[1].hand, ...s.players[1].deck].map((c) => c.defId).sort();
    expect(ids0).toEqual([...UNDEAD_DECK].sort());
    expect(ids1).toEqual([...BEAST_DECK].sort());
    const all = [...s.players[0].hand, ...s.players[0].deck, ...s.players[1].hand, ...s.players[1].deck].map((c) => c.iid);
    expect(new Set(all).size).toBe(60);
    // Seat 0's cards are c1..c30 (hand is the top of its deck), seat 1's are c31..c60.
    expect([...s.players[0].hand, ...s.players[0].deck].map((c) => c.iid)).toEqual(Array.from({ length: 30 }, (_, i) => `c${i + 1}`));
    expect(s.nextId).toBe(60);
  });

  it("opening draws from a short deck are skipped silently (no fatigue)", () => {
    const s = newMatch(TEST_SEED, [["squire"], ["squire", "squire"]]);
    expect(s.players.map((p) => p.hand.length).sort()).toEqual([1, 2]);
    expect(s.players.every((p) => p.hero.health === 30 && p.fatigue === 0)).toBe(true);
  });

  it("rejects empty decks and ids missing from defs", () => {
    expect(() => createMatch({ ...makeSetup(), players: [{ userId: "a", name: "A", deck: [] }, makeSetup().players[1]] })).toThrow(/empty deck/);
    expect(() => createMatch({ ...makeSetup(), defs: {} })).toThrow(/missing from defs/);
    expect(() => createMatch({ ...makeSetup(), seed: "xyz" })).toThrow(/invalid seed/);
  });

  it("applies hero and mana overrides", () => {
    const setup = makeSetup();
    setup.players[0] = { ...setup.players[0], heroOverrides: { startingHealth: 20, maxHealth: 25 }, manaOverrides: { cap: 7 } };
    const s = createMatch(setup);
    expect(s.players[0].hero).toEqual({ health: 20, maxHealth: 25 });
    expect(s.players[0].mana.cap).toBe(7);
    expect(s.players[1].hero).toEqual({ health: 30, maxHealth: 30 });
  });
});

describe("defsClosure", () => {
  it("includes referenced tokens transitively plus the bonus card", () => {
    const defs = defsClosure(["necromancer", "ursaria", "pack-call", STANDARD_RULES.hand.secondPlayerBonusCard!], CATALOG);
    expect(Object.keys(defs).sort()).toEqual(["bear-cub", "mana-spark", "necromancer", "pack-call", "skeleton", "ursaria", "wolf"]);
    expect(defs.necromancer).toEqual(CATALOG.necromancer);
    expect(defs.necromancer).not.toBe(CATALOG.necromancer); // deep copy
  });

  it("throws for unknown ids", () => {
    expect(() => defsClosure(["nope"], CATALOG)).toThrow(/unknown card/);
  });
});
