import { describe, expect, it } from "vitest";
import { randomCommand, seedHex } from "../testing/driver";
import { newMatch } from "../testing/matches";
import { applyCommand } from "./apply";
import { seedToRng } from "./rng";
import { getHealth } from "./stats";
import type { MatchState } from "./types";

const GAMES = 300;
const MAX_COMMANDS = 400;

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

describe("fuzz (Phase 7 row 18)", () => {
  it(`${GAMES} random games with both starter decks never throw and keep the invariants`, () => {
    const outcomes = { finished: 0, turnLimit: 0, capped: 0 };
    let commands = 0;
    for (let g = 1; g <= GAMES; g++) {
      let s = newMatch(seedHex(g));
      const driver = { rng: seedToRng(seedHex(g + 100_000)) };
      let n = 0;
      for (; n < MAX_COMMANDS && s.phase !== "finished"; n++) {
        const [seat, cmd] = randomCommand(s, driver);
        let next: MatchState;
        try {
          next = applyCommand(s, seat, cmd).state;
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
    expect(outcomes.finished + outcomes.turnLimit + outcomes.capped).toBe(GAMES);
    expect(outcomes.finished).toBeGreaterThan(0);
    expect(commands).toBeGreaterThan(GAMES * 20);
  }, 60_000);
});
