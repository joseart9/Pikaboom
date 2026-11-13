import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LegalActions } from "../engine/types";
import {
  cardDropValid,
  decideAimRelease,
  decideAttackDrop,
  decideCardDrop,
  DRAG_SLOP_PX,
  gapIndexAt,
  LONG_PRESS_MS,
  PressTracker,
  targetAt,
  zoneAt,
  type DOMRectLike,
} from "./drag";
import { IDLE, interactionReducer } from "./interaction";

const rect = (left: number, top: number, width: number, height: number): DOMRectLike => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/** n units 80 px wide with 10 px gaps, starting at x = 100. Centres at 140, 230, 320, … */
const units = (n: number) => Array.from({ length: n }, (_, i) => rect(100 + i * 90, 200, 80, 100));

// Same fixture as interaction.test.ts: c1 mob, c2 mob with targeted Grito, c3 targeted spell, c4 untargeted spell,
// c6 mob whose Grito has no valid target; u1 can attack only e1 (taunt), u2 can attack e1 or h1.
const LEGAL: LegalActions = {
  mulligan: false,
  play: {
    c1: { needsPosition: true, targets: null, targetRequired: false },
    c2: { needsPosition: true, targets: ["e1", "h1"], targetRequired: true },
    c3: { needsPosition: false, targets: ["e1", "u1"], targetRequired: true },
    c4: { needsPosition: false, targets: null, targetRequired: false },
    c6: { needsPosition: true, targets: [], targetRequired: false },
  },
  attacks: { u1: ["e1"], u2: ["e1", "h1"] },
  endTurn: true,
};

describe("gapIndexAt (nearest gap by unit centres)", () => {
  it("0 units → always gap 0", () => {
    expect(gapIndexAt(0, [])).toBe(0);
    expect(gapIndexAt(5000, [])).toBe(0);
  });

  it("1 unit → left half 0, right half 1", () => {
    const r = units(1); // centre 140
    expect(gapIndexAt(50, r)).toBe(0);
    expect(gapIndexAt(139, r)).toBe(0);
    expect(gapIndexAt(141, r)).toBe(1);
    expect(gapIndexAt(900, r)).toBe(1);
  });

  it("6 units → every gap reachable, in order", () => {
    const r = units(6); // centres 140 + 90i
    expect(gapIndexAt(0, r)).toBe(0);
    for (let i = 0; i < 6; i++) {
      const c = 140 + 90 * i;
      expect(gapIndexAt(c - 1, r)).toBe(i);
      expect(gapIndexAt(c + 1, r)).toBe(i + 1);
    }
    expect(gapIndexAt(185, r)).toBe(1); // between units 0 and 1
    expect(gapIndexAt(10_000, r)).toBe(6);
  });

  it("10 units (overflow) → 11 gaps, monotonic in x", () => {
    const r = units(10);
    const seen = new Set<number>();
    let last = -1;
    for (let x = 0; x <= 1100; x += 5) {
      const g = gapIndexAt(x, r);
      expect(g).toBeGreaterThanOrEqual(last);
      last = g;
      seen.add(g);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("zones and hit-testing", () => {
  const zones = { board: rect(0, 200, 1000, 100), hand: rect(0, 400, 1000, 200) };

  it("zoneAt", () => {
    expect(zoneAt(500, 250, zones)).toBe("board");
    expect(zoneAt(500, 450, zones)).toBe("hand");
    expect(zoneAt(500, 100, zones)).toBe("none");
    expect(zoneAt(500, 100, { board: null, hand: null })).toBe("none");
  });

  it("targetAt", () => {
    const targets = [
      { id: "e1", rect: rect(100, 50, 80, 100) },
      { id: "h1", rect: rect(900, 0, 60, 60) },
    ];
    expect(targetAt(120, 60, targets)).toBe("e1");
    expect(targetAt(930, 30, targets)).toBe("h1");
    expect(targetAt(500, 500, targets)).toBeNull();
  });

  it("cardDropValid: mobs need the board, spells anywhere above the hand", () => {
    expect(cardDropValid("mob", "board", 250, zones.hand)).toBe(true);
    expect(cardDropValid("mob", "none", 100, zones.hand)).toBe(false);
    expect(cardDropValid("mob", "hand", 450, zones.hand)).toBe(false);
    expect(cardDropValid("spell", "none", 100, zones.hand)).toBe(true);
    expect(cardDropValid("spell", "board", 250, zones.hand)).toBe(true);
    expect(cardDropValid("spell", "hand", 450, zones.hand)).toBe(false);
  });
});

describe("PressTracker (slop and long-press)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("a release before the slop and the long-press is a tap", () => {
    const onLong = vi.fn();
    const p = new PressTracker(onLong);
    p.down(100, 100);
    expect(p.move(100 + DRAG_SLOP_PX, 100)).toBe(false); // exactly the slop: still a press
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    expect(p.up()).toBe("tap");
    vi.advanceTimersByTime(1000);
    expect(onLong).not.toHaveBeenCalled();
  });

  it("very fast flicks shorter than the slop are taps", () => {
    const p = new PressTracker(() => {});
    p.down(0, 0);
    expect(p.move(3, 4)).toBe(false); // 5 px
    expect(p.up()).toBe("tap");
  });

  it("moving past the slop becomes a drag exactly once and stops the long-press", () => {
    const onLong = vi.fn();
    const p = new PressTracker(onLong);
    p.down(100, 100);
    expect(p.move(100, 100 + DRAG_SLOP_PX + 1)).toBe(true);
    expect(p.move(100, 150)).toBe(false); // already dragging
    expect(p.phase).toBe("dragging");
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLong).not.toHaveBeenCalled();
    expect(p.up()).toBe("drag");
  });

  it("holding still for LONG_PRESS_MS is a long-press; later movement does not drag", () => {
    const onLong = vi.fn();
    const p = new PressTracker(onLong);
    p.down(100, 100);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLong).toHaveBeenCalledTimes(1);
    expect(p.phase).toBe("longPressed");
    expect(p.move(300, 300)).toBe(false);
    expect(p.up()).toBe("longPress");
  });

  it("small jitter within the slop does not prevent the long-press", () => {
    const onLong = vi.fn();
    const p = new PressTracker(onLong);
    p.down(100, 100);
    p.move(103, 102);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLong).toHaveBeenCalledTimes(1);
  });

  it("cancel stops the timer; a press without long-press never fires it", () => {
    const onLong = vi.fn();
    const p = new PressTracker(onLong);
    p.down(0, 0);
    p.cancel();
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    p.down(0, 0, false);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLong).not.toHaveBeenCalled();
    expect(p.up()).toBe("tap");
    expect(p.up()).toBe("none");
  });
});

describe("drop decisions", () => {
  const mob = (iid: string, zone: "board" | "hand" | "none", gapIndex: number | null) => ({ iid, kind: "mob" as const, zone, gapIndex, aboveHand: zone !== "hand" });
  const spell = (iid: string, aboveHand: boolean) => ({ iid, kind: "spell" as const, zone: aboveHand ? ("none" as const) : ("hand" as const), gapIndex: null, aboveHand });

  it("mob on the board → play at the gap", () => {
    expect(decideCardDrop(mob("c1", "board", 2), LEGAL)).toEqual({ t: "command", command: { t: "play", card: "c1", position: 2 } });
  });

  it("mob whose Grito has no valid target plays straight away", () => {
    expect(decideCardDrop(mob("c6", "board", 0), LEGAL)).toEqual({ t: "command", command: { t: "play", card: "c6", position: 0 } });
  });

  it("mob with a targeted Grito → arrow mode from its slot", () => {
    expect(decideCardDrop(mob("c2", "board", 1), LEGAL)).toEqual({
      t: "aim",
      interaction: { mode: "awaitingTarget", card: "c2", position: 1, targets: ["e1", "h1"] },
    });
  });

  it("mob released outside the board is invalid; over the hand it is a plain cancel", () => {
    expect(decideCardDrop(mob("c1", "none", null), LEGAL)).toEqual({ t: "cancel", invalid: true });
    expect(decideCardDrop(mob("c1", "hand", null), LEGAL)).toEqual({ t: "cancel", invalid: false });
  });

  it("untargeted spell above the hand → cast", () => {
    expect(decideCardDrop(spell("c4", true), LEGAL)).toEqual({ t: "command", command: { t: "play", card: "c4" } });
  });

  it("targeted spell above the hand → arrow mode; over the hand → cancel", () => {
    expect(decideCardDrop(spell("c3", true), LEGAL)).toEqual({
      t: "aim",
      interaction: { mode: "awaitingTarget", card: "c3", position: null, targets: ["e1", "u1"] },
    });
    expect(decideCardDrop(spell("c3", false), LEGAL)).toEqual({ t: "cancel", invalid: false });
  });

  it("unplayable or unknown cards and a null legal never produce a command", () => {
    expect(decideCardDrop(mob("c5", "board", 0), LEGAL)).toEqual({ t: "cancel", invalid: true });
    expect(decideCardDrop(spell("c4", true), null)).toEqual({ t: "cancel", invalid: true });
  });

  it("attack arrow released on a legal target → attack", () => {
    expect(decideAttackDrop("u2", "h1", LEGAL)).toEqual({ t: "command", command: { t: "attack", attacker: "u2", target: "h1" } });
  });

  it("attack arrow onto a Provocar-protected hero is invalid; on nothing/itself it is a cancel", () => {
    expect(decideAttackDrop("u1", "h1", LEGAL)).toEqual({ t: "cancel", invalid: true });
    expect(decideAttackDrop("u1", null, LEGAL)).toEqual({ t: "cancel", invalid: false });
    expect(decideAttackDrop("u1", "u1", LEGAL)).toEqual({ t: "cancel", invalid: false });
    expect(decideAttackDrop("u3", "e1", LEGAL)).toEqual({ t: "cancel", invalid: true }); // not ready
    expect(decideAttackDrop("u2", "e1", null)).toEqual({ t: "cancel", invalid: true });
  });

  it("aim release: on a target → the play/attack command; elsewhere → cancel", () => {
    const aiming = decideCardDrop(mob("c2", "board", 1), LEGAL);
    if (aiming.t !== "aim") throw new Error("expected aim");
    expect(decideAimRelease(aiming.interaction, "h1", LEGAL)).toEqual({
      t: "command",
      command: { t: "play", card: "c2", position: 1, target: "h1" },
    });
    expect(decideAimRelease(aiming.interaction, "u2", LEGAL)).toEqual({ t: "cancel", invalid: true });
    expect(decideAimRelease(aiming.interaction, null, LEGAL)).toEqual({ t: "cancel", invalid: false });
    const attacker = interactionReducer(IDLE, { t: "tapEntity", id: "u2" }, LEGAL).state;
    expect(decideAimRelease(attacker, "e1", LEGAL)).toEqual({ t: "command", command: { t: "attack", attacker: "u2", target: "e1" } });
    expect(decideAimRelease(IDLE, "e1", LEGAL)).toEqual({ t: "cancel", invalid: false });
  });

  it("drag and tap agree: every drop command equals the tap-mode command", () => {
    for (const iid of Object.keys(LEGAL.play)) {
      const kind = iid === "c3" || iid === "c4" ? "spell" : "mob";
      const d = decideCardDrop(kind === "mob" ? mob(iid, "board", 0) : spell(iid, true), LEGAL);
      let s = interactionReducer(IDLE, { t: "tapHandCard", iid, kind }, LEGAL).state;
      const r = kind === "mob" ? interactionReducer(s, { t: "tapSlot", index: 0 }, LEGAL) : interactionReducer(s, { t: "tapCast" }, LEGAL);
      s = r.state;
      if (d.t === "command") expect(r.command).toEqual(d.command);
      else if (d.t === "aim") expect(s.mode === "awaitingTarget" || d.interaction.mode === "awaitingTarget").toBe(true);
    }
  });
});
