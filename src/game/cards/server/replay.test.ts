import { describe, expect, it } from "vitest";
import { applyCommand } from "../engine/apply";
import { seedToRng } from "../engine/rng";
import type { MatchState } from "../engine/types";
import { randomCommand, seedHex } from "../testing/driver";
import { makeSetup } from "../testing/matches";
import { createMatch } from "../engine/setup";
import { replay, type EngineCommandLog } from "./replay";
import { isServiceError } from "./errors";

describe("replay (Phase 8 row 13)", () => {
  it("30 seeded random games replay to identical states (lobby entries skipped)", () => {
    for (let g = 1; g <= 30; g++) {
      const setup = makeSetup(seedHex(7000 + g));
      let s: MatchState = createMatch(setup);
      const driver = { rng: seedToRng(seedHex(8000 + g)) };
      const log: EngineCommandLog[] = [
        { seat: 1, command: { t: "lobby.join" }, seq: 2 },
        { seat: 0, command: { t: "lobby.ready" }, seq: 3 },
      ];
      let seq = 3;
      for (let n = 0; n < 250 && s.phase !== "finished"; n++) {
        const [seat, command] = n === 40 && g % 5 === 0 ? [s.turn.activeSeat, { t: "timeout" } as const] : randomCommand(s, driver);
        s = applyCommand(s, seat, command).state;
        log.push({ seat, command, seq: ++seq });
      }
      // Stored order is irrelevant: replay sorts by seq.
      const shuffled = [...log].reverse();
      expect(replay(setup, shuffled), `game ${g}`).toEqual(s);
    }
    // ~4 s alone; the default 5 s limit is too tight when the whole suite runs in parallel (UI-10).
  }, 30_000);

  it("refuses setups from another engine version", () => {
    const setup = { ...makeSetup(), engineVersion: 999 };
    try {
      replay(setup, []);
      expect.fail("should throw");
    } catch (e) {
      expect(isServiceError(e) && e.code).toBe("replay_unavailable");
    }
  });
});
