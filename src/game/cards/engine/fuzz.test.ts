import { describe, expect, it } from "vitest";
import { randomCommand, seedHex } from "../testing/driver";
import { DECK_FORMATS } from "../config/deckRules";
import { validateDeck } from "../decks/validate";
import { BEAST_DECK, newMatch, randomCatalogDeck, TEST_STATUS_DECK, UNDEAD_DECK } from "../testing/matches";
import type { CardId } from "../catalog/types";
import { applyCommand } from "./apply";
import { seedToRng } from "./rng";
import { getHealth } from "./stats";
import type { MatchState } from "./types";

const GAMES = 300;
const MAX_COMMANDS = 400;
const STATUS_GAMES = 150;
const ALL_CARDS_GAMES = 200;

/** Invariants after every command (plain checks for speed; returns a description of the first violation). */
function violation(s: MatchState): string | null {
  const iids = new Set<string>();
  for (const p of s.players) {
    if (p.hand.length > s.rules.hand.max) return `seat ${p.seat} hand ${p.hand.length}`;
    if (p.board.length > s.rules.board.hardLimit) return `seat ${p.seat} board ${p.board.length}`;
    const m = p.mana;
    if (m.current < 0 || m.current > s.rules.mana.cap || m.max < 0 || m.max > s.rules.mana.cap || m.temporary < 0) {
      return `seat ${p.seat} mana ${JSON.stringify(m)}`;
    }
    for (const u of p.board) {
      if (getHealth(u) <= 0 || u.pendingDestroy) return `unit ${u.iid} on board with health ${getHealth(u)}`;
      if (u.controller !== p.seat) return `unit ${u.iid} on seat ${p.seat}'s board controlled by ${u.controller}`;
      if (new Set(u.statuses.map((st) => st.id)).size !== u.statuses.length) return `unit ${u.iid} has a duplicate status`;
      if (u.silenced && Object.keys(u.keywords).length > 0) return `silenced unit ${u.iid} kept keywords`;
      for (const st of u.statuses) {
        if (st.expiresAfterTurn !== null && st.expiresAfterTurn < s.turn.number - 1) return `unit ${u.iid} kept expired ${st.id}`;
      }
    }
    for (const zone of [p.hand, p.deck, p.board]) {
      for (const { iid } of zone) {
        if (iids.has(iid)) return `duplicate iid ${iid}`;
        iids.add(iid);
      }
    }
  }
  return null;
}

/** Plays `games` random games (decks chosen per game) and checks the invariants after every command. */
function fuzz(games: number, seedBase: number, decksFor: (g: number) => [CardId[], CardId[]] | undefined) {
  const outcomes = { finished: 0, turnLimit: 0, capped: 0 };
  const seen = new Set<string>();
  let commands = 0;
  for (let g = 1; g <= games; g++) {
    let s = newMatch(seedHex(seedBase + g), decksFor(g));
    const driver = { rng: seedToRng(seedHex(seedBase + g + 100_000)) };
    let n = 0;
    for (; n < MAX_COMMANDS && s.phase !== "finished"; n++) {
      const [seat, cmd] = randomCommand(s, driver);
      let next: MatchState;
      try {
        const r = applyCommand(s, seat, cmd);
        next = r.state;
        for (const e of r.events) seen.add(e.type);
      } catch (e) {
        throw new Error(`game ${g} command ${n} ${JSON.stringify(cmd)}: ${String(e)}`);
      }
      s = next;
      const bad = violation(s);
      if (bad) expect.fail(`game ${g} command ${n} ${JSON.stringify(cmd)}: ${bad}`);
    }
    commands += n;
    if (s.phase === "finished") {
      if (s.endReason === "turn_limit") outcomes.turnLimit++;
      else outcomes.finished++;
    } else {
      expect(n).toBe(MAX_COMMANDS);
      outcomes.capped++;
    }
  }
  expect(outcomes.finished + outcomes.turnLimit + outcomes.capped).toBe(games);
  expect(outcomes.finished).toBeGreaterThan(0);
  expect(commands).toBeGreaterThan(games * 20);
  return seen;
}

describe("fuzz (Phase 7 row 18)", () => {
  it(`${GAMES} random games with both starter decks never throw and keep the invariants`, () => {
    fuzz(GAMES, 0, () => undefined);
  }, 60_000);
});

describe("fuzz with random all-cards decks (Phase 19 I)", () => {
  it("the generator builds valid 30-card decks from the whole catalog", () => {
    for (let n = 1; n <= 40; n++) {
      const deck = randomCatalogDeck(n);
      const entries = [...new Set(deck)].map((cardId) => ({ cardId, count: deck.filter((d) => d === cardId).length }));
      expect(validateDeck(entries, DECK_FORMATS.standard, null, "play"), `deck ${n}`).toEqual([]);
    }
    expect(randomCatalogDeck(7)).toEqual(randomCatalogDeck(7));
  });

  it(`${ALL_CARDS_GAMES} random games with random all-cards decks never throw and keep the invariants`, () => {
    const seen = fuzz(ALL_CARDS_GAMES, 70_000, (g) => [randomCatalogDeck(2 * g), randomCatalogDeck(2 * g + 1)]);
    // The games really exercise the Phase 19 rules.
    for (const t of ["MOB_TRANSFORMED", "MOB_RETURNED_TO_HAND", "CONTROL_CHANGED", "CARD_STOLEN"]) expect(seen.has(t), t).toBe(true);
  }, 120_000);
});

describe("fuzz with the status deck (Phase 18 G.12)", () => {
  it(`${STATUS_GAMES} random games of TEST_STATUS_DECK vs each starter deck never throw and keep the invariants`, () => {
    const seen = fuzz(STATUS_GAMES, 50_000, (g) => (g % 2 === 0 ? [TEST_STATUS_DECK, UNDEAD_DECK] : [BEAST_DECK, TEST_STATUS_DECK]));
    // The games really exercise the new rules.
    for (const t of ["STATUS_APPLIED", "STATUS_REMOVED", "MOB_SILENCED"]) expect(seen.has(t), t).toBe(true);
  }, 60_000);
});
