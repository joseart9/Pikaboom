import { describe, expect, it } from "vitest";
import type { ViewEvent } from "../server/view";
import { appendCardLog, CARD_LOG_MAX, cardLogEntries, type CardLogEntry } from "./cardLog";

const ev = (e: Record<string, unknown>) => ({ step: 0, ...e }) as unknown as ViewEvent;

describe("card log", () => {
  it("records played cards and slain units with the turn they happened on", () => {
    const entries = cardLogEntries(
      [
        ev({ type: "CARD_PLAYED", seq: 1, seat: 0, iid: "c1", defId: "a", target: null, position: 0 }),
        ev({ type: "TURN_STARTED", seq: 2, seat: 1, turn: 4 }),
        ev({ type: "DAMAGE", seq: 3 }),
        ev({ type: "MOB_DESTROYED", seq: 4, seat: 0, iid: "u1", defId: "a", index: 0 }),
      ],
      3,
    );
    expect(entries).toEqual([
      { seq: 1, kind: "played", seat: 0, defId: "a", turn: 3 },
      { seq: 4, kind: "slain", seat: 0, defId: "a", turn: 4 },
    ]);
  });

  it("appends only newer entries and stays bounded", () => {
    const one: CardLogEntry = { seq: 5, kind: "played", seat: 1, defId: "b", turn: 1 };
    const log = appendCardLog([], [one]);
    expect(appendCardLog(log, [one])).toBe(log); // duplicate → unchanged
    const many = Array.from({ length: CARD_LOG_MAX + 10 }, (_, i): CardLogEntry => ({ ...one, seq: 10 + i }));
    const big = appendCardLog(log, many);
    expect(big).toHaveLength(CARD_LOG_MAX);
    expect(big[big.length - 1].seq).toBe(10 + CARD_LOG_MAX + 9);
  });
});
